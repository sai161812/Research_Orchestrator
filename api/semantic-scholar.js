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

  const { query, fields, offset = '0', limit = '10', match } = req.query
  const integer = (value, min, max) => typeof value === 'string' &&
    /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) &&
    Number(value) >= min && Number(value) <= max
  if (typeof query !== 'string' || !query.trim() || query.length > 2000 ||
      (fields !== undefined && (typeof fields !== 'string' || !/^[a-zA-Z0-9.,]+$/.test(fields) || fields.length > 1000)) ||
      (match !== undefined && !['true', 'false'].includes(match)) ||
      !integer(offset, 0, 9999) || !integer(limit, 1, 100)) {
    return res.status(400).json({ error: 'Invalid query, fields or pagination' })
  }

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
      signal: AbortSignal.timeout(15000),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Orchestrix/1.0'
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Semantic Scholar error: ${response.status}`
      })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    const timeout = err.name === 'TimeoutError' || err.name === 'AbortError'
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? 'Semantic Scholar request timed out' : 'Semantic Scholar request failed'
    })
  }
}
