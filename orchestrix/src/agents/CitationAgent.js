// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAuthorsAPA(authors) {
  if (!authors?.length) return 'Unknown Author'
  return authors.map((a, i) => {
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

// ─── Citation Formatters ──────────────────────────────────────────────────────
function generateAPA(paper) {
  const authors = formatAuthorsAPA(paper.authors)
  const year = paper.year ? `(${paper.year})` : '(n.d.)'
  const title = paper.title || 'Untitled'
  const source = getSourceLabel(paper)
  const url = paper.url || ''
  return `${authors} ${year}. ${title}. ${source}. ${url}`
}

function generateMLA(paper) {
  const authors = formatAuthorsMLA(paper.authors)
  const title = `"${paper.title || 'Untitled'}"`
  const source = getSourceLabel(paper)
  const year = paper.year || 'n.d.'
  const url = paper.url || ''
  return `${authors}. ${title} ${source}, ${year}, ${url}`
}

function generateIEEE(paper) {
  const authors = formatAuthorsIEEE(paper.authors)
  const title = `"${paper.title || 'Untitled'}"`
  const source = getSourceLabel(paper)
  const year = paper.year || 'n.d.'
  const url = paper.url || ''
  return `${authors}, ${title} ${source}, ${year}. [Online]. Available: ${url}`
}

// ─── BibTeX ───────────────────────────────────────────────────────────────────
function generateBibtex(paper) {
  const key = (paper.authors?.[0]?.name?.split(' ').pop() || 'Unknown') +
    (paper.year || 'nd') +
    paper.title?.split(' ')[0]?.toLowerCase()

  const authors = paper.authors?.map(a => a.name).join(' and ') || 'Unknown'

  return `@article{${key},
  title     = {${paper.title || 'Untitled'}},
  author    = {${authors}},
  year      = {${paper.year || 'n.d.'}},
  url       = {${paper.url || ''}},
  journal   = {${getSourceLabel(paper)}}
}`
}

// ─── Generate All ─────────────────────────────────────────────────────────────
function generateAll(paper) {
  return {
    APA: generateAPA(paper),
    MLA: generateMLA(paper),
    IEEE: generateIEEE(paper),
    bibtex: generateBibtex(paper)
  }
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

const CitationAgent = { generateAll, generateAPA, generateMLA, generateIEEE, generateBibtex, exportTxt, exportBib }
export default CitationAgent