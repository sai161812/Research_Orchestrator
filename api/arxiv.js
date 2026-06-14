export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { search_query, start, max_results } = req.query

  if (!search_query) {
    return res.status(400).json({ error: 'search_query param required' })
  }

  try {
    const params = new URLSearchParams({
      search_query,
      start: start || '0',
      max_results: max_results || '10',
      sortBy: 'relevance',
      sortOrder: 'descending'
    })

    const url = `https://export.arxiv.org/api/query?${params}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Orchestrix/1.0'
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: `arXiv error: ${response.status}`
      })
    }

    const text = await response.text()

    // Return XML as text with correct content type
    res.setHeader('Content-Type', 'application/xml')
    return res.status(200).send(text)

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}