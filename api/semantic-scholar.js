export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Pull raw query string params — do NOT re-encode them through URLSearchParams
  // because the query value may already contain quotes ("attention is all you need")
  // and URLSearchParams would double-encode them.
  const { query, fields, offset, limit } = req.query

  if (!query) {
    return res.status(400).json({ error: 'query param required' })
  }

  try {
    // Build the URL by hand so quotes in the query are preserved as-is.
    // encodeURIComponent converts `"` → `%22` exactly once.
    const f = fields || 'title,authors,year,abstract,citationCount,url,externalIds'
    const o = offset || '0'
    const l = limit || '10'
    const isMatch = req.query.match === 'true'

    const baseUrl = isMatch 
      ? `https://api.semanticscholar.org/graph/v1/paper/search/match`
      : `https://api.semanticscholar.org/graph/v1/paper/search`

    const url = 
      `${baseUrl}?query=${encodeURIComponent(query)}` +
      `&fields=${encodeURIComponent(f)}` +
      `${!isMatch ? `&offset=${o}&limit=${l}` : ''}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Orchestrix/1.0'
      }
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({
        error: `Semantic Scholar error: ${response.status}`,
        detail: text
      })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}