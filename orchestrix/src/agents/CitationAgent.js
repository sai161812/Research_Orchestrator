// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAuthorsAPA(authors) {
  if (!authors?.length) return 'Unknown Author'
  return authors.map((a) => {
    const parts = a.name.trim().split(' ')
    const last = parts[parts.length - 1]
    const initials = parts.slice(0, -1).map(n => n[0] + '.').join(' ')
    return `${last}, ${initials}`
  }).join(', ')
}

function formatAuthorsMLA(authors) {
  if (!authors?.length) return 'Unknown Author'
  if (authors.length === 1) {
    const parts = authors[0].name.trim().split(' ')
    const last = parts[parts.length - 1]
    const first = parts.slice(0, -1).join(' ')
    return `${last}, ${first}`
  }
  const first = authors[0].name.trim().split(' ')
  const last = first[first.length - 1]
  const firstN = first.slice(0, -1).join(' ')
  return `${last}, ${firstN}, et al`
}

function formatAuthorsIEEE(authors) {
  if (!authors?.length) return 'Unknown Author'
  return authors.map(a => {
    const parts = a.name.trim().split(' ')
    const last = parts[parts.length - 1]
    const initials = parts.slice(0, -1).map(n => n[0] + '.').join(' ')
    return `${initials} ${last}`
  }).join(', ')
}

function getSourceLabel(paper) {
  if (paper.source === 'arxiv') return 'arXiv'
  return 'Semantic Scholar'
}

function safeText(value, fallback = 'Untitled') {
  const text = String(value || '').trim()
  return text || fallback
}

function formatYear(paper, style = 'generic') {
  if (!paper.year) return style === 'apa' ? '(n.d.)' : 'n.d.'
  return style === 'apa' ? `(${paper.year})` : String(paper.year)
}

// ─── Citation Formatters ──────────────────────────────────────────────────────
function generateAPA(paper) {
  const authors = formatAuthorsAPA(paper.authors)
  const year = formatYear(paper, 'apa')
  const title = safeText(paper.title)
  const source = getSourceLabel(paper)
  const url = safeText(paper.url, '')
  return `${authors} ${year}. ${title}. ${source}.${url ? ` ${url}` : ''}`
}

function generateMLA(paper) {
  const authors = formatAuthorsMLA(paper.authors)
  const title = `"${safeText(paper.title)}."`
  const source = getSourceLabel(paper)
  const year = formatYear(paper)
  const url = safeText(paper.url, '')
  return `${authors}. ${title} ${source}, ${year}.${url ? ` ${url}` : ''}`
}

function generateIEEE(paper) {
  const authors = formatAuthorsIEEE(paper.authors)
  const title = `"${safeText(paper.title)}"`
  const source = getSourceLabel(paper)
  const year = formatYear(paper)
  const url = safeText(paper.url, '')
  const yearPart = year === 'n.d.' ? year : `${year}`
  return `${authors}, ${title}, ${source}, ${yearPart}.${url ? ` [Online]. Available: ${url}` : ''}`
}

function generateChicago(paper) {
  const primaryAuthor = paper.authors?.[0]?.name || 'Unknown Author'
  const extraAuthors = (paper.authors?.length || 0) > 1 ? ', et al.' : '.'
  const title = safeText(paper.title)
  const source = getSourceLabel(paper)
  const year = formatYear(paper)
  const url = safeText(paper.url, '')
  return `${primaryAuthor}${extraAuthors} "${title}." ${source}, ${year}.${url ? ` ${url}` : ''}`
}

// ─── BibTeX ───────────────────────────────────────────────────────────────────
function generateBibtex(paper) {
  const key = (paper.authors?.[0]?.name?.split(' ').pop() || 'Unknown') +
    (paper.year || 'nd') +
    safeText(paper.title, 'paper').split(' ')[0]?.toLowerCase()

  const authors = paper.authors?.map(a => a.name).join(' and ') || 'Unknown'

  return `@article{${key},
  title     = {${safeText(paper.title)}},
  author    = {${authors}},
  year      = {${paper.year || ''}},
  url       = {${safeText(paper.url, '')}},
  journal   = {${getSourceLabel(paper)}}
}`
}

// ─── Generate All ─────────────────────────────────────────────────────────────
function generateAll(paper) {
  return {
    APA: generateAPA(paper),
    MLA: generateMLA(paper),
    IEEE: generateIEEE(paper),
    Chicago: generateChicago(paper),
    bibtex: generateBibtex(paper)
  }
}

function exportSessionReport(session) {
  const papers = session.papers || []
  const citations = session.citations || {}
  const summaries = session.summaries || {}
  const analyses = session.analyses || {}

  let report = ''
  report += '═'.repeat(60) + '\n'
  report += `ORCHESTRIX RESEARCH REPORT\n`
  report += `Session: ${session.name || session.query}\n`
  report += `Query: ${session.query}\n`
  report += `Date: ${new Date(session.timestamp).toLocaleString()}\n`
  report += `Total Papers: ${papers.length}\n`
  report += '═'.repeat(60) + '\n\n'

  // Analysis summary
  if (analyses.averageCitations) {
    report += '── ANALYSIS SUMMARY ──\n'
    report += `Average Citations: ${analyses.averageCitations}\n`
    report += `Year Range: ${analyses.yearRange?.min}–${analyses.yearRange?.max}\n`
    report += `Top Keyword: ${analyses.keywordFrequency?.[0]?.word || '—'}\n`
    report += `Top Author: ${analyses.topAuthors?.[0]?.name || '—'}\n`
    if (analyses.emergingTopics?.length) {
      report += `Emerging Topics: ${analyses.emergingTopics.map(t => t.word).join(', ')}\n`
    }
    report += '\n'
  }

  // Papers
  report += '── PAPERS ──\n\n'
  papers.forEach((paper, i) => {
    const cite = citations[paper.id]
    const summary = summaries[paper.id]

    report += `[${i + 1}] ${paper.title}\n`
    report += `    Authors: ${paper.authors?.map(a => a.name).join(', ') || 'Unknown'}\n`
    report += `    Year: ${paper.year || 'n.d.'} | Citations: ${paper.citationCount || 0} | Source: ${paper.source}\n`
    report += `    URL: ${paper.url || '—'}\n`
    report += `    Relevance Score: ${paper.relevanceScore?.toFixed(3) || '—'}\n`

    if (paper.abstract) {
      report += `    Abstract: ${paper.abstract.slice(0, 200)}...\n`
    }

    if (summary) {
      report += `\n    SUMMARY:\n`
      summary.split('\n').forEach(line => {
        report += `    ${line}\n`
      })
    }

    if (cite) {
      report += `\n    CITATIONS:\n`
      report += `    APA:  ${cite.APA}\n`
      report += `    MLA:  ${cite.MLA}\n`
      report += `    IEEE: ${cite.IEEE}\n`
      report += `    Chicago: ${cite.Chicago}\n`
    }

    report += '\n' + '─'.repeat(60) + '\n\n'
  })

  const blob = new Blob([report], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orchestrix-report-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Bulk Export ──────────────────────────────────────────────────────────────
function exportTxt(papers, citations) {
  let content = 'ORCHESTRIX — CITATION EXPORT\n'
  content += '='.repeat(50) + '\n\n'

  papers.forEach((paper, i) => {
    const c = citations[paper.id]
    if (!c) return
    content += `[${i + 1}] ${paper.title}\n`
    content += '-'.repeat(40) + '\n'
    content += `APA:   ${c.APA}\n`
    content += `MLA:   ${c.MLA}\n`
    content += `IEEE:  ${c.IEEE}\n\n`
    content += `Chicago: ${c.Chicago}\n\n`
  })

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'citations.txt'
  a.click()
  URL.revokeObjectURL(url)
}

function exportBib(papers, citations) {
  let content = '% ORCHESTRIX — BibTeX EXPORT\n\n'

  papers.forEach(paper => {
    const c = citations[paper.id]
    if (!c) return
    content += c.bibtex + '\n\n'
  })

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'citations.bib'
  a.click()
  URL.revokeObjectURL(url)
}

const CitationAgent = {
  generateAll, generateAPA, generateMLA,
  generateIEEE, generateChicago, generateBibtex,
  exportTxt, exportBib, exportSessionReport
}
export default CitationAgent