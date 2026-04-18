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

// ─── Session PDF Export (Print-Friendly) ───────────────────────────────────────
function exportSessionPdf(session, style = 'APA') {
  const papers = session.papers || []
  const citations = session.citations || {}
  const summaries = session.summaries || {}
  const analyses = session.analyses || {}

  const title = `Orchestrix Research Report`
  const sessionLabel = session.name || session.query || 'Untitled Session'
  const createdAt = new Date(session.timestamp).toLocaleString()

  const escapeHtml = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  let bodyContent = ''

  // Header
  bodyContent += `<h1>${escapeHtml(title)}</h1>`
  bodyContent += `<p class="meta"><strong>Session:</strong> ${escapeHtml(sessionLabel)}</p>`
  bodyContent += `<p class="meta"><strong>Query:</strong> ${escapeHtml(session.query || '')}</p>`
  bodyContent += `<p class="meta"><strong>Date:</strong> ${escapeHtml(createdAt)}</p>`
  bodyContent += `<p class="meta"><strong>Total Papers:</strong> ${papers.length}</p>`

  // Analyses (if available)
  if (analyses && Object.keys(analyses).length > 0) {
    bodyContent += `<h2>Analysis Summary</h2>`
    bodyContent += `<ul>`
    if (analyses.averageCitations != null) {
      bodyContent += `<li><strong>Average Citations:</strong> ${escapeHtml(analyses.averageCitations)}</li>`
    }
    if (analyses.yearRange) {
      bodyContent += `<li><strong>Year Range:</strong> ${escapeHtml(analyses.yearRange.min)}–${escapeHtml(analyses.yearRange.max)}</li>`
    }
    if (analyses.keywordFrequency?.length) {
      bodyContent += `<li><strong>Top Keyword:</strong> ${escapeHtml(analyses.keywordFrequency[0].word)}</li>`
    }
    if (analyses.topAuthors?.length) {
      bodyContent += `<li><strong>Top Author:</strong> ${escapeHtml(analyses.topAuthors[0].name)}</li>`
    }
    if (analyses.emergingTopics?.length) {
      bodyContent += `<li><strong>Emerging Topics:</strong> ${escapeHtml(analyses.emergingTopics.map(t => t.word).join(', '))}</li>`
    }
    bodyContent += `</ul>`
  }

  // Papers
  if (papers.length > 0) {
    bodyContent += `<h2>Papers</h2>`
    papers.forEach((paper, index) => {
      const cite = citations[paper.id]
      const summary = summaries[paper.id]
      const citationText = cite?.[style]

      bodyContent += `<div class="paper">`
      bodyContent += `<h3>${index + 1}. ${escapeHtml(paper.title || 'Untitled')}</h3>`
      bodyContent += `<p class="meta"><strong>Authors:</strong> ${escapeHtml(paper.authors?.map(a => a.name).join(', ') || 'Unknown')}</p>`
      bodyContent += `<p class="meta"><strong>Year:</strong> ${escapeHtml(paper.year || 'n.d.')} &nbsp;|&nbsp; <strong>Citations:</strong> ${escapeHtml(paper.citationCount || 0)} &nbsp;|&nbsp; <strong>Source:</strong> ${escapeHtml(paper.source || '')}</p>`
      if (paper.url) {
        bodyContent += `<p class="meta"><strong>Link:</strong> <a href="${escapeHtml(paper.url)}">${escapeHtml(paper.url)}</a></p>`
      }
      if (paper.abstract) {
        bodyContent += `<h4>Abstract</h4>`
        bodyContent += `<p>${escapeHtml(paper.abstract)}</p>`
      }
      if (summary) {
        bodyContent += `<h4>Summary</h4>`
        bodyContent += `<p>${escapeHtml(summary).replace(/\n/g, '<br/>')}</p>`
      }
      if (citationText) {
        bodyContent += `<h4>Citation (${escapeHtml(style)})</h4>`
        bodyContent += `<p class="citation">${escapeHtml(citationText)}</p>`
      }
      bodyContent += `</div>`
    })
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(sessionLabel)}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #020617;
      background: #fafafa;
      margin: 32px;
      line-height: 1.6;
    }
    h1 {
      font-size: 26px;
      margin-bottom: 4px;
    }
    h2 {
      font-size: 20px;
      margin-top: 32px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 16px;
      margin-top: 24px;
      margin-bottom: 4px;
    }
    h4 {
      font-size: 14px;
      margin-top: 12px;
      margin-bottom: 4px;
    }
    p {
      margin: 4px 0;
      font-size: 13px;
    }
    .meta {
      color: #475569;
      font-size: 12px;
    }
    .paper {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .citation {
      font-size: 12px;
      font-style: italic;
    }
    ul {
      padding-left: 18px;
      font-size: 13px;
    }
    a {
      color: #1d4ed8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media print {
      body {
        margin: 20mm;
        background: #ffffff;
      }
      a {
        color: #000000;
        text-decoration: none;
      }
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>
`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 300)
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
  exportTxt, exportBib, exportSessionReport, exportSessionPdf
}
export default CitationAgent