import { createPaper } from '../utils/schema'
import {
  normalizeText,
  computeTitleMatchScore,
  deduplicateAndMerge
} from '../utils/paperUtils'

const isProd = import.meta.env.PROD

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchSemanticScholar(query, offset = 0, limit = 10) {
  const fields = 'paperId,title,authors,year,abstract,citationCount,url,externalIds'
  const url = isProd
    ? `/api/semantic-scholar?query=${encodeURIComponent(query)}&fields=${fields}&offset=${offset}&limit=${limit}`
    : `/api/semantic-scholar/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&offset=${offset}&limit=${limit}`

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) {
        const retryInMs = 500 * attempt
        console.warn(`fetchSemanticScholar: rate limited (attempt ${attempt}/2), retrying in ${retryInMs}ms`)
        await sleep(retryInMs)
        continue
      }

      if (!res.ok) {
        const detail = await res.text()
        console.warn(`SS failed: status=${res.status} query="${query}" detail=${detail.slice(0, 200)}`)
        return []
      }

      const data = await res.json()
      const rows = Array.isArray(data?.data) ? data.data : []
      console.log(`SS success: query="${query}" offset=${offset} limit=${limit} returned=${rows.length}`)

      return rows.map(p => {
        const paper = createPaper()
        paper.id = p.paperId || crypto.randomUUID()
        paper.title = p.title || 'Untitled'
        paper.normalizedTitle = normalizeText(paper.title, true)
        paper.doi = p.externalIds?.DOI || ''
        paper.authors = (p.authors || []).map(a => ({ name: a.name, id: a.authorId }))
        paper.year = p.year || null
        paper.abstract = p.abstract || 'No abstract available.'
        paper.url = p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : '')
        paper.citationCount = p.citationCount || 0
        paper.source = 'semanticscholar'
        return paper
      })
    } catch (e) {
      console.warn(`SS error (attempt ${attempt}/2):`, e.message)
      if (attempt === 2) return []
      await sleep(400)
    }
  }
  return []
}

async function fetchArxiv(query, start = 0, maxResults = 10) {
  const url = isProd
    ? `/api/arxiv?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}`
    : `/api/arxiv/api/query?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('arXiv failed:', res.status)
      return []
    }
    const text = await res.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, 'application/xml')
    const entries = Array.from(xml.querySelectorAll('entry'))
    console.log(`arXiv success: query="${query}" start=${start} max=${maxResults} returned=${entries.length}`)
    return entries.map(entry => {
      const paper = createPaper()
      const rawId = entry.querySelector('id')?.textContent || ''
      paper.id = 'arxiv-' + rawId.split('/abs/').pop().replace(/\//g, '-')
      paper.title = entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || 'Untitled'
      paper.normalizedTitle = normalizeText(paper.title, true)
      paper.authors = Array.from(entry.querySelectorAll('author name')).map(n => ({
        name: n.textContent.trim(), id: null
      }))
      const published = entry.querySelector('published')?.textContent || ''
      paper.year = published ? new Date(published).getFullYear() : null
      paper.doi = entry.querySelector('doi')?.textContent?.trim() || ''
      paper.abstract = entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || 'No abstract available.'
      paper.url = entry.querySelector('id')?.textContent?.trim() || ''
      paper.citationCount = 0
      paper.source = 'arxiv'
      return paper
    })
  } catch (e) {
    console.warn('arXiv error:', e.message)
    return []
  }
}

async function run(query, page = 1) {
  const limit = 8
  const offset = (page - 1) * limit
  console.log('DiscoveryAgent:', query)

  let ssPapers = await fetchSemanticScholar(query, offset, limit)
  await sleep(500)
  
  const words = query.split(" ").filter(Boolean);
  if (words.length >= 3) {
      console.log('Trying exact title query for Semantic Scholar...')
      const exactSsPapers = await fetchSemanticScholar(`"${query}"`, 0, 5)
      ssPapers = [...ssPapers, ...exactSsPapers]
      await sleep(400)
  }

  const arxivPapers = await fetchArxiv(query, offset, limit)
  
  console.log(`Merged source counts before dedupe -> SS: ${ssPapers.length}, arXiv: ${arxivPapers.length}`)

  let allPapers = [...ssPapers, ...arxivPapers]
  
  // Step 5 Detection Flow
  if (words.length >= 3) {
      const normalizedQuery = normalizeText(query, true);
      let maxScore = -1;
      let topPaperIds = [];
      
      allPapers.forEach(paper => {
          const score = computeTitleMatchScore(normalizedQuery, paper.normalizedTitle);
          if (score > maxScore) {
              maxScore = score;
              topPaperIds = [paper.id];
          } else if (score === maxScore) {
              topPaperIds.push(paper.id);
          }
      });
      
      if (maxScore >= 0.85 && topPaperIds.length > 0) {
          console.log(`EXACT MATCH FOUND (Score: ${maxScore})`);
          allPapers = allPapers.map(p => {
              if (topPaperIds.includes(p.id)) p.isExactMatch = true;
              return p;
          });
      }
  }

  const final = deduplicateAndMerge(allPapers)

  const sourceStats = final.reduce((acc, p) => {
    acc[p.source] = (acc[p.source] || 0) + 1
    return acc
  }, {})
  
  console.log(`Total after dedupe: ${final.length}, bySource:`, sourceStats)
  return final
}

const DiscoveryAgent = { run }
export default DiscoveryAgent