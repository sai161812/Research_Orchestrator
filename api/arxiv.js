export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { search_query, start = '0', max_results = '10' } = req.query
  const integer = (value, min, max) => typeof value === 'string' &&
    /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) &&
    Number(value) >= min && Number(value) <= max
  if (typeof search_query !== 'string' || !search_query.trim() ||
      search_query.length > 2000 || !integer(start, 0, Number.MAX_SAFE_INTEGER) ||
      !integer(max_results, 1, 100)) {
    return res.status(400).json({ error: 'Invalid search query or pagination' })
  }

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
      signal: AbortSignal.timeout(15000),
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
    const timeout = err.name === 'TimeoutError' || err.name === 'AbortError'
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? 'arXiv request timed out' : 'arXiv request failed'
    })
  }
}
