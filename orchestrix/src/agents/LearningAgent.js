const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(prompt) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  
  if (!apiKey) {
    return { error: 'VITE_GROQ_API_KEY not found in .env file.' }
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
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: `Groq error: ${err?.error?.message || res.status}` }
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    try {
      return JSON.parse(raw)
    } catch (_) {
      return { error: 'LLM returned invalid JSON structure.' }
    }
  } catch (e) {
    return { error: `Network error: ${e.message}` }
  }
}

export default {
  async generateLearningPath(paper) {
    if (!paper) return { error: 'No paper provided.' }

    const prompt = `You are an expert academic mentor. A student wants to read the following advanced research paper but lacks the background knowledge.
Title: ${paper.title}
Abstract: ${paper.abstract}

Extract the key prerequisite concepts they MUST understand first, and map out a step-by-step learning path.
Respond ONLY with a valid JSON object matching this exact structure, with no markdown formatting or extra text:
{
  "key_concepts": [
    { "concept": "Concept Name", "explanation": "A very brief, intuitive 1-2 sentence explanation of what this is in plain English." }
  ],
  "learning_path": [
    { "step": 1, "topic": "Fundamental Topic", "description": "What to study first to build the foundation." },
    { "step": 2, "topic": "Intermediate Topic", "description": "How to progress." }
  ]
}`

    return await callGroq(prompt)
  }
}
