import { clearTrace, addTraceStep, getTrace } from '../store/traceStore'
import { createSession } from '../utils/schema'
import { saveSession, updateSession } from '../store/sessionStore'
import DiscoveryAgent from '../agents/DiscoveryAgent'
import AnalysisAgent from '../agents/AnalysisAgent'
import CitationAgent from '../agents/CitationAgent'
import SummarizationAgent from '../agents/SummarizationAgent'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(prompt, maxTokens = 400) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: maxTokens
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// ─── Step 1: Deep Query Understanding ────────────────────────────────────────
async function understandQuery(query) {
  const prompt = `
You are an expert academic research query classifier. Analyze the user query with deep understanding.

Query: "${query}"

Classify into EXACTLY one of these types:
- "paper_title": Query looks like an exact paper title (4+ words, academic sounding, no question words, no "top/best/recent") e.g. "attention is all you need", "bert pre-training of deep bidirectional transformers"
- "topic": A broad research area or subject e.g. "AI in healthcare", "quantum computing", "deep learning"
- "entity_person": A specific person e.g. "Geoffrey Hinton", "Yann LeCun", "Elon Musk"
- "entity_org": A specific organization or lab e.g. "OpenAI", "DeepMind", "Google Brain"
- "entity_concept": A specific named concept/model/system e.g. "GPT-4", "BERT", "Stable Diffusion"
- "request_recent": User wants recent/latest papers e.g. "recent advances in NLP", "latest computer vision papers 2024"
- "request_top": User wants top/best papers e.g. "top papers on reinforcement learning", "most cited ML papers"
- "request_explain": User wants explanation/understanding e.g. "explain transformers", "how does RLHF work"
- "request_compare": User wants comparison e.g. "BERT vs GPT", "compare diffusion models and GANs"
- "request_survey": User wants survey/overview e.g. "survey of NLP methods", "overview of computer vision"

Then determine:
1. searchQueries: 1-2 optimized academic search queries (clean keywords, no fluff). For paper_title use the exact title. For entity use related research domains.
2. subTopics: Only for entity types — 3-4 research domains related to the entity
3. needsAnalysis: true for topic/request_survey/request_top/entity types, false for paper_title/request_explain
4. needsSummary: true for request_explain types, false otherwise
5. needsCitations: false unless query explicitly mentions citations/references
6. recencyBias: true for request_recent types, false otherwise
7. isPaperTitle: true ONLY if type is paper_title
8. isEntity: true ONLY if type starts with entity_
9. entityType: "person" | "organization" | "concept" | null
10. reasoning: one clear sentence explaining your classification

Respond ONLY with valid JSON, no markdown, no explanation outside JSON:
{
  "type": "paper_title|topic|entity_person|entity_org|entity_concept|request_recent|request_top|request_explain|request_compare|request_survey",
  "searchQueries": ["query1", "query2"],
  "subTopics": [],
  "needsAnalysis": true,
  "needsSummary": false,
  "needsCitations": false,
  "recencyBias": false,
  "isPaperTitle": false,
  "isEntity": false,
  "entityType": null,
  "reasoning": "..."
}

Examples:
- "attention is all you need" → type: paper_title, isPaperTitle: true, needsAnalysis: false
- "Geoffrey Hinton" → type: entity_person, isEntity: true, entityType: person, subTopics: [backpropagation, deep learning, neural networks, capsule networks]
- "explain how transformers work" → type: request_explain, needsSummary: true, needsAnalysis: false
- "recent NLP advances 2024" → type: request_recent, recencyBias: true, needsAnalysis: true
- "BERT vs GPT comparison" → type: request_compare, needsAnalysis: true, searchQueries: ["BERT language model", "GPT language model"]
- "OpenAI" → type: entity_org, isEntity: true, entityType: organization, subTopics: [large language models, reinforcement learning from human feedback, AI safety, GPT architecture]
`

  try {
    const text = await callGroq(prompt, 600)
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Normalize — map new types to pipeline decisions
    return {
      ...parsed,
      // Keep backward compat — treat all entity_ types as entity for confirmation flow
      type: parsed.isEntity ? 'entity' : parsed.type
    }
  } catch (e) {
    console.warn('Intent classification failed, using fallback:', e.message)
    return {
      type: 'topic',
      searchQueries: [query],
      subTopics: [],
      needsAnalysis: true,
      needsSummary: false,
      needsCitations: false,
      recencyBias: false,
      isPaperTitle: false,
      isEntity: false,
      entityType: null,
      reasoning: 'Fallback — classification failed'
    }
  }
}

// ─── Improved Relevance Scoring ───────────────────────────────────────────────
function scoreRelevance(paper, cleanKeywords, recencyBias) {
  const text = `${paper.title} ${paper.abstract}`.toLowerCase()
  const matched = cleanKeywords.filter(k => text.includes(k.toLowerCase())).length
  const keywordScore = cleanKeywords.length > 0 ? matched / cleanKeywords.length : 0
  const currentYear = new Date().getFullYear()
  const age = currentYear - (paper.year || currentYear)
  const recencyScore = recencyBias
    ? Math.max(0, 1 - age / 3)
    : Math.max(0, 1 - age / 10)
  const citationScore = Math.min((paper.citationCount || 0) / 1000, 1)
  if (recencyBias) {
    return (keywordScore * 0.4) + (recencyScore * 0.45) + (citationScore * 0.15)
  }
  return (keywordScore * 0.4) + (recencyScore * 0.25) + (citationScore * 0.35)
}

// ─── Extract clean keywords from search queries ───────────────────────────────
function extractKeywords(queries) {
  const stopwords = new Set([
    'the','a','an','and','or','in','on','of','for','to','with',
    'about','top','best','recent','latest','new','papers','research',
    'study','studies','using','based','from','this','that','these'
  ])
  const words = queries.join(' ').toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  return [...new Set(words.filter(w => !stopwords.has(w)))]
}

// ─── Main Run ─────────────────────────────────────────────────────────────────
export async function runOrchestrator(query, sessionName, onTraceUpdate) {
  clearTrace()
  const session = createSession()
  session.name = sessionName || query
  session.query = query
  saveSession(session)

  const log = (agent, status, message, duration = null) => {
    addTraceStep({ agent, status, message, duration })
    if (onTraceUpdate) onTraceUpdate(getTrace())
  }

  try {
    // ── Step 1: Understand ───────────────────────────────────────────────────
    log('orchestrator', 'running', `Understanding: "${query}"`)
    const intent = await understandQuery(query)
    session.mode = intent.type
    log('orchestrator', 'done',
      `Type: ${intent.type} | Analysis: ${intent.needsAnalysis} | Summary: ${intent.needsSummary} | Citations: ${intent.needsCitations} — ${intent.reasoning}`)

    // Entity → pause for confirmation
    if (intent.type === 'entity') {
      session.entityMeta = { type: intent.entityType, subTopics: intent.subTopics || [] }
      updateSession(session.id, { mode: session.mode, entityMeta: session.entityMeta })
      return {
        status: 'awaiting_confirmation',
        sessionId: session.id,
        intent,
        trace: getTrace()
      }
    }

    // ── Step 2: Discovery ────────────────────────────────────────────────────
    const queries = [intent.searchQueries?.[0] || query]
    const cleanKeywords = extractKeywords(queries)
    log('discovery', 'running',
      `Searching: ${queries.map(q => `"${q}"`).join(', ')}`)

    const discStart = Date.now()
    const allPapers = []
    for (const q of queries) {
      try {
        const papers = await DiscoveryAgent.run(q, 1, intent.recencyBias)
        allPapers.push(...papers)
      } catch (e) {
        log('discovery', 'error', `Failed for "${q}": ${e.message}`)
      }
    }

    // Deduplicate by title
    const seen = new Set()
    const unique = allPapers.filter(p => {
      const key = p.title.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // ── FIX: preserve exact matches — re-score only non-exact papers ─────────
    // DiscoveryAgent pins exact matches with relevanceScore=1.0 and isExactMatch=true.
    // Re-scoring them here would overwrite that score and let high-citation
    // keyword results beat them in the sort. We skip re-scoring for exact matches
    // and keep them at the front regardless of citation count or keyword overlap.
    const exactMatches = unique.filter(p => p.isExactMatch)
    const rest = unique.filter(p => !p.isExactMatch)

    const scoredRest = rest.map(p => ({
      ...p,
      relevanceScore: scoreRelevance(p, cleanKeywords, intent.recencyBias)
    }))
    scoredRest.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Exact matches stay at top with their score=1.0, keyword results follow
    const papers = [...exactMatches, ...scoredRest]

    log('discovery', 'done',
      `Found ${papers.length} papers (${exactMatches.length} exact match${exactMatches.length !== 1 ? 'es' : ''}).`,
      Date.now() - discStart)

    session.papers = papers
    updateSession(session.id, { papers })

    // ── Step 3: Analysis — only if needed ───────────────────────────────────
    let analyses = {}
    if (intent.needsAnalysis) {
      const anaStart = Date.now()
      log('analysis', 'running', 'Orchestrator decided: analysis needed. Running...')
      analyses = AnalysisAgent.run(papers)
      log('analysis', 'done',
        'Trend, author, keyword, citation analysis complete.',
        Date.now() - anaStart)
      session.analyses = analyses
      updateSession(session.id, { analyses })
    } else {
      log('analysis', 'done', 'Orchestrator decided: analysis not needed for this query. Skipped.')
    }

    // ── Step 4: Auto-summarize top paper — only if needed ───────────────────
    let summaries = {}
    if (intent.needsSummary && papers.length > 0) {
      const sumStart = Date.now()
      log('summarization', 'running',
        'Orchestrator decided: summary needed. Summarizing top paper...')
      const topPaper = papers[0]
      const summary = await SummarizationAgent.summarizePaper(topPaper)
      summaries[topPaper.id] = summary
      session.summaries = summaries
      updateSession(session.id, { summaries })
      log('summarization', 'done',
        `Auto-summarized: "${topPaper.title.slice(0, 50)}..."`,
        Date.now() - sumStart)
    } else if (!intent.needsSummary) {
      log('summarization', 'done',
        'Orchestrator decided: auto-summary not needed. Available on demand.')
    }

    // ── Step 5: Citations ────────────────────────────────────────────────────
    let citations = {}
    if (intent.needsCitations) {
      const citStart = Date.now()
      log('citation', 'running',
        'Orchestrator decided: citations needed. Generating...')
      for (const paper of papers) {
        citations[paper.id] = CitationAgent.generateAll(paper)
      }
      log('citation', 'done',
        `Generated citations for ${papers.length} papers.`,
        Date.now() - citStart)
    } else {
      for (const paper of papers) {
        citations[paper.id] = CitationAgent.generateAll(paper)
      }
      log('citation', 'done',
        'Orchestrator decided: citations available on demand (not forced).')
    }

    session.citations = citations
    updateSession(session.id, { citations, summaries })

    const trace = getTrace()
    updateSession(session.id, { trace })

    return {
      status: 'done',
      sessionId: session.id,
      papers,
      analyses,
      citations,
      summaries,
      intent,
      trace
    }
  } catch (err) {
    log('orchestrator', 'error', `Fatal error: ${err.message}`)
    updateSession(session.id, { trace: getTrace() })
    return {
      status: 'error',
      sessionId: session.id,
      error: err.message,
      trace: getTrace()
    }
  }
}

// ─── Continue after entity confirmation ───────────────────────────────────────
export async function continueEntityRun(sessionId, subTopics, onTraceUpdate) {
  const { updateSession } = await import('../store/sessionStore')
  clearTrace()

  const log = (agent, status, message, duration = null) => {
    addTraceStep({ agent, status, message, duration })
    if (onTraceUpdate) onTraceUpdate(getTrace())
  }

  log('orchestrator', 'running',
    `Entity confirmed. Searching ${subTopics.length} sub-topics...`)

  const allPapers = []
  for (const topic of subTopics) {
    const start = Date.now()
    log('discovery', 'running', `Fetching: "${topic}"`)
    try {
      const papers = await DiscoveryAgent.run(topic)
      papers.forEach(p => p.subTopic = topic)
      allPapers.push(...papers)
      log('discovery', 'done',
        `${papers.length} papers for "${topic}"`, Date.now() - start)
    } catch (e) {
      log('discovery', 'error', `Failed for "${topic}": ${e.message}`)
    }
  }

  // Deduplicate
  const seen = new Set()
  const merged = allPapers.filter(p => {
    const key = p.title.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  merged.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Entity queries always get analysis
  log('analysis', 'running', `Analysing ${merged.length} papers across domains...`)
  const analyses = AnalysisAgent.run(merged)
  log('analysis', 'done', 'Cross-domain analysis complete.')

  // Citations always available
  log('citation', 'running', 'Generating citations...')
  const citations = {}
  for (const paper of merged) {
    citations[paper.id] = CitationAgent.generateAll(paper)
  }
  log('citation', 'done', `Citations ready for ${merged.length} papers.`)

  const trace = getTrace()
  updateSession(sessionId, { papers: merged, analyses, citations, trace })

  return { status: 'done', sessionId, papers: merged, analyses, citations, trace }
}