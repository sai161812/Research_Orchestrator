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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fuzzy title match — exact, substring, or ≥80% token overlap
function titlesMatch(queryTitle, paperTitle) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
  const q = norm(queryTitle)
  const p = norm(paperTitle)
  if (p === q) return true
  if (p.includes(q) || q.includes(p)) return true
  const qTokens = new Set(q.split(' ').filter(w => w.length > 2))
  const pTokens = p.split(' ').filter(w => w.length > 2)
  if (qTokens.size === 0) return false
  const overlap = pTokens.filter(t => qTokens.has(t)).length
  return overlap / qTokens.size >= 0.8
}

// ── Exact title search via quoted phrase ──────────────────────────────────────
// Runs FIRST, before the keyword search, with a delay after to avoid 429.
async function fetchExactTitle(query) {
  const quotedQuery = `"${query}"`
  const fields = 'title,authors,year,abstract,citationCount,url'

  // In dev: Vite proxy rewrites /api/semantic-scholar → https://api.semanticscholar.org
  //         path becomes /graph/v1/paper/search?query=...
  // In prod: Vercel serverless at /api/semantic-scholar receives query param
  const url = isProd
    ? `/api/semantic-scholar?query=${encodeURIComponent(quotedQuery)}&fields=${fields}&offset=0&limit=5`
    : `/api/semantic-scholar/graph/v1/paper/search?query=${encodeURIComponent(quotedQuery)}&fields=${fields}&offset=0&limit=5`

  try {
    const res = await fetch(url)
    if (res.status === 429) {
      console.warn('fetchExactTitle: rate limited, skipping exact match')
      return []
    }
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || [])
      .filter(p => p.title && titlesMatch(query, p.title))
      .map(p => {
        const paper = createPaper()
        paper.id = p.paperId || crypto.randomUUID()
        paper.title = p.title || 'Untitled'
        paper.authors = (p.authors || []).map(a => ({ name: a.name, id: a.authorId }))
        paper.year = p.year || null
        paper.abstract = p.abstract || 'No abstract available.'
        paper.url = p.url || `https://www.semanticscholar.org/paper/${p.paperId}`
        paper.citationCount = p.citationCount || 0
        paper.source = 'semanticscholar'
        paper.isExactMatch = true
        return paper
      })
  } catch (e) {
    console.warn('fetchExactTitle error:', e.message)
    return []
  }
}

async function fetchSemanticScholar(query, offset = 0, limit = 10) {
  const fields = 'title,authors,year,abstract,citationCount,url'
  const url = isProd
    ? `/api/semantic-scholar?query=${encodeURIComponent(query)}&fields=${fields}&offset=${offset}&limit=${limit}`
    : `/api/semantic-scholar/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&offset=${offset}&limit=${limit}`

  try {
    const res = await fetch(url)
    if (res.status === 429) {
      console.warn('fetchSemanticScholar: rate limited')
      return []
    }
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

async function run(query, page = 1, recencyBias = false) {
  const limit = 8
  const offset = (page - 1) * limit
  const keywords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)

  console.log('DiscoveryAgent:', query)

  // ── Sequential requests to avoid 429 from Semantic Scholar ──────────────
  // SS rate limits aggressive parallel requests. We run exact title search
  // first (1 SS request), wait 600ms, then run keyword search (1 SS request),
  // then arXiv in parallel with nothing (separate domain, no conflict).

  const exactMatches = await fetchExactTitle(query)
  console.log(`Exact matches: ${exactMatches.length}`)

  await sleep(600) // avoid 429 between two SS requests

  const [ssPapers, arxivPapers] = await Promise.all([
    fetchSemanticScholar(query, offset, limit),
    fetchArxiv(query, offset, limit)         // different domain — safe to parallel
  ])

  console.log(`SS: ${ssPapers.length}, arXiv: ${arxivPapers.length}`)

  // Deduplicate keyword results — filter out anything already in exactMatches
  const exactTitles = new Set(
    exactMatches.map(p =>
      p.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
    )
  )

  const rest = deduplicate([...ssPapers, ...arxivPapers]).filter(p => {
    const normTitle = p.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
    return !exactTitles.has(normTitle)
  })

  const scored = rest.map(paper => ({
    ...paper,
    relevanceScore: scoreRelevance(paper, keywords, recencyBias)
  }))
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Exact matches pinned at top with score 1.0
  const scoredExact = exactMatches.map(p => ({ ...p, relevanceScore: 1.0 }))

  const final = [...scoredExact, ...scored]
  console.log(`Total: ${final.length}`)
  return final
}

const DiscoveryAgent = { run }
export default DiscoveryAgent