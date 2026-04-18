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

async function summarizePaper(paper, length = 'medium') {
  const lengthConfig = {
    short: {
      instruction: 'Write a concise 2-3 sentence summary.',
      maxTokens: 150
    },
    medium: {
      instruction: 'Write a structured summary with 4 sections.',
      maxTokens: 400
    },
    detailed: {
      instruction: 'Write a comprehensive detailed analysis covering all aspects.',
      maxTokens: 800
    }
  }

  const config = lengthConfig[length] || lengthConfig.medium

  const formatMap = {
    short: `Give a 2-3 sentence plain summary covering what it's about and why it matters.`,
    medium: `Respond in exactly this format:
**What it's about:** (1-2 sentences)
**Key contribution:** (1-2 sentences)
**Method used:** (1 sentence)
**Why it matters:** (1-2 sentences)`,
    detailed: `Respond in exactly this format:
**Overview:** (3-4 sentences about the paper's topic and context)
**Problem Statement:** (2-3 sentences about what problem it solves)
**Methodology:** (3-4 sentences about the approach and techniques used)
**Key Findings:** (3-4 sentences about results and contributions)
**Limitations:** (1-2 sentences about what's missing or could be improved)
**Impact & Relevance:** (2-3 sentences about why this matters to the field)
**Who should read this:** (1 sentence)`
  }

  const prompt = `You are a research assistant. Summarize this academic paper.

Title: ${paper.title}
Authors: ${paper.authors?.map(a => a.name).join(', ') || 'Unknown'}
Year: ${paper.year || 'Unknown'}
Abstract: ${paper.abstract}

${config.instruction}

${formatMap[length]}`

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return 'Error: VITE_GROQ_API_KEY not found in .env file.'

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
        max_tokens: config.maxTokens
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

async function compareTwoPapers(paperA, paperB) {
  const prompt = `Compare these two research papers and return the strictly formatted JSON response below. Do not use markdown backticks in your output.

Paper 1: "${paperA.title}" (Citations: ${paperA.citationCount || 0}, Year: ${paperA.year || 'Unknown'})
Abstract 1: ${paperA.abstract?.slice(0, 400)}

Paper 2: "${paperB.title}" (Citations: ${paperB.citationCount || 0}, Year: ${paperB.year || 'Unknown'})
Abstract 2: ${paperB.abstract?.slice(0, 400)}

Required Output Format (JSON strictly):
{
  "summary_diff": "How the core approaches or topics differ.",
  "citation_comparison": "Which has more impact based on citations.",
  "recency_comparison": "Which is more modern and recent.",
  "key_takeaways": "What the combination of these papers implies."
}`;

  try {
    const text = await callGroq(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return {
      error: 'Failed to generate comparison.',
      details: e.message
    };
  }
}

const SummarizationAgent = { summarizePaper, synthesizePapers, compareTwoPapers }
export default SummarizationAgent