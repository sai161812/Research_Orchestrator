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
You are an academic research assistant. Analyze this user query deeply.
Query: "${query}"
Determine:
1. type: "topic" (research area), "entity" (person/org/product), "request" (specific ask like top papers/recent/explain)
2. intent: what the user actually wants
3. needsAnalysis: true if user wants trends/stats/overview, false if just listing papers
4. needsSummary: true if user wants explanation/understanding, false if just finding papers
5. needsCitations: true if user explicitly wants citations/references
6. searchQueries: 2-3 optimized academic search queries (clean keywords only, no fluff words like "top" or "recent")
7. recencyBias: true if user wants recent papers (last 3 years)
8. entityType: "person"|"organization"|"concept"|null
9. subTopics: array of 3-4 research domains (only if entity type)
10. reasoning: one sentence
Respond ONLY with valid JSON, no markdown:
{
  "type": "topic|entity|request",
  "intent": "...",
  "needsAnalysis": true,
  "needsSummary": false,
  "needsCitations": false,
  "searchQueries": ["query1", "query2"],
  "recencyBias": false,
  "entityType": null,
  "subTopics": [],
  "reasoning": "..."
}
`
  try {
    const text = await callGroq(prompt, 500)
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      type: 'topic',
      intent: 'find papers',
      needsAnalysis: true,
      needsSummary: false,
      needsCitations: false,
      searchQueries: [query],
      recencyBias: false,
      entityType: null,
      subTopics: [],
      reasoning: 'Fallback to direct search'
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