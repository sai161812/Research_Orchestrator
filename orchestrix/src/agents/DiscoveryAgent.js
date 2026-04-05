import { createPaper } from '../utils/schema'

const isProd = import.meta.env.PROD

function scoreRelevance(paper, keywords, recencyBias = false) {
  const text = `${paper.title} ${paper.abstract}`.toLowerCase()
  const matched = keywords.filter(k => text.includes(k.toLowerCase())).length
  const keywordScore = keywords.length > 0 ? matched / keywords.length : 0
  const currentYear = new Date().getFullYear()
  const age = currentYear - (paper.year || currentYear)
  const recencyScore = recencyBias
    ? Math.max(0, 1 - age / 3)
    : Math.max(0, 1 - age / 10)
  const citationScore = Math.min((paper.citationCount || 0) / 1000, 1)
  return recencyBias
    ? (keywordScore * 0.4) + (recencyScore * 0.45) + (citationScore * 0.15)
    : (keywordScore * 0.4) + (recencyScore * 0.25) + (citationScore * 0.35)
}

async function fetchSemanticScholar(query, offset = 0, limit = 10) {
  const url = isProd
    ? `/api/semantic-scholar?query=${encodeURIComponent(query)}&fields=title,authors,year,abstract,citationCount,url&offset=${offset}&limit=${limit}`
    : `/api/semantic-scholar/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,abstract,citationCount,url&offset=${offset}&limit=${limit}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('SS failed:', res.status)
      return []
    }
    const data = await res.json()
    return (data.data || []).map(p => {
      const paper = createPaper()
      paper.id = p.paperId || crypto.randomUUID()
      paper.title = p.title || 'Untitled'
      paper.authors = (p.authors || []).map(a => ({ name: a.name, id: a.authorId }))
      paper.year = p.year || null
      paper.abstract = p.abstract || 'No abstract available.'
      paper.url = p.url || `https://www.semanticscholar.org/paper/${p.paperId}`
      paper.citationCount = p.citationCount || 0
      paper.source = 'semanticscholar'
      return paper
    })
  } catch (e) {
    console.warn('SS error:', e.message)
    return []
  }
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

    return entries.map(entry => {
      const paper = createPaper()
      const rawId = entry.querySelector('id')?.textContent || ''
      paper.id = 'arxiv-' + rawId.split('/abs/').pop().replace(/\//g, '-')
      paper.title = entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || 'Untitled'
      paper.authors = Array.from(entry.querySelectorAll('author name')).map(n => ({
        name: n.textContent.trim(), id: null
      }))
      const published = entry.querySelector('published')?.textContent || ''
      paper.year = published ? new Date(published).getFullYear() : null
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

function deduplicate(papers) {
  const seen = new Set()
  return papers.filter(p => {
    const key = p.title.toLowerCase().replace(/\s+/g, ' ').trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run(query, page = 1, recencyBias = false) {
  const limit = 8
  const offset = (page - 1) * limit
  const keywords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)

  console.log('DiscoveryAgent:', query)

  const ssPapers = await fetchSemanticScholar(query, offset, limit)
  await sleep(500)
  const arxivPapers = await fetchArxiv(query, offset, limit)

  console.log(`SS: ${ssPapers.length}, arXiv: ${arxivPapers.length}`)

  const merged = deduplicate([...ssPapers, ...arxivPapers])
  const scored = merged.map(paper => ({
    ...paper,
    relevanceScore: scoreRelevance(paper, keywords, recencyBias)
  }))
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  console.log(`Total: ${scored.length}`)
  return scored
}

const DiscoveryAgent = { run }
export default DiscoveryAgent