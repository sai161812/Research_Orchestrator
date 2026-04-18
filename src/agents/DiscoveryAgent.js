import { createPaper } from '../utils/schema'
import {
  normalizeText,
  computeTitleMatchScore,
  deduplicateAndMerge
} from '../utils/paperUtils'


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchSemanticScholar(query, offset = 0, limit = 10) {
  const fields = 'paperId,title,authors,year,abstract,citationCount,url,externalIds'
  const url = `/api/semantic-scholar?query=${encodeURIComponent(query)}&fields=${fields}&offset=${offset}&limit=${limit}`

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
        paper.normalizedTitle = normalizeText(paper.title, false)
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

async function fetchSemanticScholarMatch(query) {
  const fields = 'paperId,title,authors,year,abstract,citationCount,url,externalIds'
  const url = `/api/semantic-scholar?match=true&query=${encodeURIComponent(query)}&fields=${fields}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      if (res.status !== 404) console.warn(`SS Match failed: status=${res.status} query="${query}"`)
      return null
    }

    const data = await res.json()
    if (!data || !data.paperId) return null

    const paper = createPaper()
    paper.id = data.paperId
    paper.title = data.title || 'Untitled'
    paper.normalizedTitle = normalizeText(paper.title, false)
    paper.doi = data.externalIds?.DOI || ''
    paper.authors = (data.authors || []).map(a => ({ name: a.name, id: a.authorId }))
    paper.year = data.year || null
    paper.abstract = data.abstract || 'No abstract available.'
    paper.url = data.url || (data.paperId ? `https://www.semanticscholar.org/paper/${data.paperId}` : '')
    paper.citationCount = data.citationCount || 0
    paper.source = 'semanticscholar'
    paper.isExactMatch = true
    return paper
  } catch (e) {
    console.warn(`SS Match error:`, e.message)
    return null
  }
}

async function fetchArxiv(query, start = 0, maxResults = 10) {
  const url = `/api/arxiv?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}`

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
      paper.normalizedTitle = normalizeText(paper.title, false)
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
  
  // Preserve the user's literal query for upstream APIs and normalize only for scoring.
  const rawQuery = String(query || '').replace(/\s+/g, ' ').trim()
  const normalizedQuery = normalizeText(rawQuery, false)
  if (!rawQuery) return []
  console.log('DiscoveryAgent running for:', rawQuery)

  const words = normalizedQuery.split(" ").filter(Boolean);
  const looksLikeTitle = words.length >= 3;

  // Fast path for likely title queries on first page:
  // hit exact-match endpoint first and skip slower arXiv round-trip when found.
  if (looksLikeTitle && page === 1) {
    const matchedPaper = await fetchSemanticScholarMatch(rawQuery)
    if (matchedPaper) {
      console.log('Fast exact-title path used. Returning exact matched paper immediately.')
      return [{ ...matchedPaper, isExactMatch: true }]
    }
  }
  
  // 1. Parallel launch:
  // For likely title queries, prioritize Semantic Scholar only for speed/precision.
  const searchPromises = [fetchSemanticScholar(rawQuery, offset, limit)];

  // Also try exact match if query looks like a title
  if (looksLikeTitle) {
      searchPromises.push(fetchSemanticScholarMatch(rawQuery));
  } else {
      searchPromises.push(fetchArxiv(rawQuery, offset, limit));
  }

  const results = await Promise.all(searchPromises);
  
  let ssPapers = results[0] || [];
  let arxivPapers = [];
  let matchedPaper = null;

  if (looksLikeTitle) {
    matchedPaper = results[1] || null;
  } else {
    arxivPapers = results[1] || [];
  }

  if (matchedPaper) {
      console.log('EXACT TITLE MATCH FOUND via SS Match Endpoint:', matchedPaper.title)
      ssPapers = [matchedPaper, ...ssPapers];
  }

  // 2. Fallback Quoted Search (Only if absolutely necessary)
  // If no high-confidence match found yet, we try one more specific search
  const allCurrent = [...ssPapers, ...arxivPapers];
  const hasStrongMatch = allCurrent.some(p => {
      const score = computeTitleMatchScore(normalizedQuery, p.normalizedTitle);
      return score >= 0.95;
  });

  if (looksLikeTitle && !hasStrongMatch) {
      console.log('No strong match found in parallel results, trying quoted fallback...');
      const exactSsPapers = await fetchSemanticScholar(`"${rawQuery}"`, 0, 5)
      ssPapers = [...ssPapers, ...exactSsPapers]
      // Still no strong SS match? try arXiv as last fallback for title query.
      if (arxivPapers.length === 0) {
        arxivPapers = await fetchArxiv(rawQuery, offset, limit)
      }
  }

  console.log(`Merged source counts before dedupe -> SS: ${ssPapers.length}, arXiv: ${arxivPapers.length}`)

  let allPapers = [...ssPapers, ...arxivPapers]
  
  // Detection Flow for Exact Matches (Standardize markers)
  if (looksLikeTitle) {
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
      
      if (maxScore >= 0.95 && topPaperIds.length > 0) {
          allPapers = allPapers.map(p => {
              if (topPaperIds.includes(p.id)) {
                  if (!p.isExactMatch) console.log(`Marking EXACT MATCH (Score: ${maxScore}): ${p.title}`);
                  p.isExactMatch = true;
              }
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