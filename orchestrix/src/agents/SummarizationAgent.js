const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(prompt) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  
  if (!apiKey) {
    return 'Error: VITE_GROQ_API_KEY not found in .env file.'
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 600
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return `Groq error: ${err?.error?.message || res.status}`
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || 'No response from Groq.'
  } catch (e) {
    return `Network error: ${e.message}`
  }
}

async function summarizePaper(paper) {
  const prompt = `You are a research assistant. Summarize this paper clearly and concisely.

Title: ${paper.title}
Authors: ${paper.authors?.map(a => a.name).join(', ') || 'Unknown'}
Year: ${paper.year || 'Unknown'}
Abstract: ${paper.abstract}

Respond in exactly this format:
**What it's about:** (1-2 sentences)
**Key contribution:** (1-2 sentences)
**Method used:** (1 sentence)
**Why it matters:** (1-2 sentences)`

  return await callGroq(prompt)
}

async function synthesizePapers(papers) {
  if (papers.length < 2) return 'Select at least 2 papers for synthesis.'

  const paperList = papers.map((p, i) =>
    `Paper ${i + 1}: "${p.title}" (${p.year || 'n.d.'})\nAbstract: ${p.abstract?.slice(0, 300)}...`
  ).join('\n\n')

  const prompt = `You are a research analyst. Synthesize these ${papers.length} papers.

${paperList}

Respond in exactly this format:
**Common Themes:** (2-3 sentences)
**Key Differences:** (2-3 sentences)
**Research Gaps:** (1-2 sentences)
**Overall Insight:** (1-2 sentences)`

  return await callGroq(prompt)
}

const SummarizationAgent = { summarizePaper, synthesizePapers }
export default SummarizationAgent