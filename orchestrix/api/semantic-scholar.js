export default async function handler(req, res) {
  // Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { query, fields, offset, limit } = req.query

  if (!query) {
    return res.status(400).json({ error: 'query param required' })
  }

  try {
    const params = new URLSearchParams({
      query,
      fields: fields || 'title,authors,year,abstract,citationCount,url',
      offset: offset || '0',
      limit: limit || '10'
    })

    const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params}`

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