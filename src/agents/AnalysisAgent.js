// ─── Stopwords (filter these from keyword extraction) ─────────────────────────
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','was','are','were','be','been','has','have','had',
  'that','this','these','those','it','its','we','our','their','they','which',
  'also','can','may','using','based','paper','study','research','results',
  'method','methods','approach','proposed','show','shows','shown','used',
  'use','uses','new','two','one','three','data','model','models','system'
])

// ─── Publication Volume Trend ─────────────────────────────────────────────────
function getPublicationTrend(papers) {
  const counts = {}
  papers.forEach(p => {
    if (p.year) counts[p.year] = (counts[p.year] || 0) + 1
  })
  return Object.entries(counts)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year)
}

// ─── Top Authors ──────────────────────────────────────────────────────────────
function getTopAuthors(papers, topN = 10) {
  const counts = {}
  papers.forEach(p => {
    (p.authors || []).forEach(a => {
      if (!a.name) return
      counts[a.name] = (counts[a.name] || 0) + 1
    })
  })
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

// ─── Keyword Frequency ────────────────────────────────────────────────────────
function getKeywordFrequency(papers, topN = 20) {
  const counts = {}
  papers.forEach(p => {
    const text = `${p.title} ${p.abstract}`.toLowerCase()
    const words = text.match(/\b[a-z]{4,}\b/g) || []
    words.forEach(word => {
      if (STOPWORDS.has(word)) return
      counts[word] = (counts[word] || 0) + 1
    })
  })
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

// ─── Citation Impact Distribution ─────────────────────────────────────────────
function getCitationDistribution(papers) {
  const buckets = {
    '0': 0,
    '1–10': 0,
    '11–50': 0,
    '51–200': 0,
    '201–1000': 0,
    '1000+': 0
  }
  papers.forEach(p => {
    const c = p.citationCount || 0
    if (c === 0) buckets['0']++
    else if (c <= 10) buckets['1–10']++
    else if (c <= 50) buckets['11–50']++
    else if (c <= 200) buckets['51–200']++
    else if (c <= 1000) buckets['201–1000']++
    else buckets['1000+']++
  })
  return Object.entries(buckets).map(([range, count]) => ({ range, count }))
}

// ─── Emerging Sub-topics ──────────────────────────────────────────────────────
function getEmergingTopics(papers, topN = 5) {
  const currentYear = new Date().getFullYear()
  const recentPapers = papers.filter(p => p.year && p.year >= currentYear - 2)

  const counts = {}
  recentPapers.forEach(p => {
    const text = `${p.title} ${p.abstract}`.toLowerCase()
    const words = text.match(/\b[a-z]{5,}\b/g) || []
    words.forEach(word => {
      if (STOPWORDS.has(word)) return
      counts[word] = (counts[word] || 0) + 1
    })
  })

  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

// ─── Source Distribution ──────────────────────────────────────────────────────
function getSourceDistribution(papers) {
  const counts = {}
  papers.forEach(p => {
    counts[p.source] = (counts[p.source] || 0) + 1
  })
  return Object.entries(counts).map(([source, count]) => ({ source, count }))
}

// ─── Main Run ─────────────────────────────────────────────────────────────────
function run(papers) {
  if (!papers || papers.length === 0) return {}

  return {
    publicationTrend: getPublicationTrend(papers),
    topAuthors: getTopAuthors(papers),
    keywordFrequency: getKeywordFrequency(papers),
    citationDistribution: getCitationDistribution(papers),
    emergingTopics: getEmergingTopics(papers),
    sourceDistribution: getSourceDistribution(papers),
    totalPapers: papers.length,
    averageCitations: Math.round(
      papers.reduce((sum, p) => sum + (p.citationCount || 0), 0) / papers.length
    ),
    yearRange: {
      min: Math.min(...papers.filter(p => p.year).map(p => p.year)),
      max: Math.max(...papers.filter(p => p.year).map(p => p.year))
    }
  }
}

const AnalysisAgent = { run }
export default AnalysisAgent