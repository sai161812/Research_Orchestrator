import { clearTrace, addTraceStep, getTrace } from '../store/traceStore'
import { createSession } from '../utils/schema'
import { saveSession, updateSession } from '../store/sessionStore'
import DiscoveryAgent from '../agents/DiscoveryAgent'
import AnalysisAgent from '../agents/AnalysisAgent'
import CitationAgent from '../agents/CitationAgent'
import SummarizationAgent from '../agents/SummarizationAgent'
import { deduplicateAndMerge, hybridRank, applySmartFilters } from '../utils/paperUtils'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(prompt, maxTokens = 400) {
  try {
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
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
  } catch(e) {
      console.warn("Groq Error:", e.message);
      return '';
  }
}

function ruleBasedClassify(query) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);
  
  let type = 'unknown';
  if (words.length >= 4 && !q.includes('vs') && !q.includes('explain') && !q.includes('recent')) {
    type = 'title';
  } else if (q.includes('explain') || q.includes('how does')) {
    type = 'topic';
  } else if (q.includes('vs ') || q.includes('compare ')) {
    type = 'topic';
  } else if (q.includes('recent ') || q.includes('latest ')) {
    type = 'topic';
  }
  
  // Known entities
  if (['openai', 'deepmind', 'google', 'meta', 'yann lecun', 'geoffrey hinton'].some(ent => q.includes(ent))) {
      type = 'entity';
  }
  
  return {
    type,
    searchQueries: [query],
    needsAnalysis: type !== 'title',
    needsSummary: type === 'title' || q.includes('explain'),
    needsCitations: true,
    recencyBias: q.includes('recent') || q.includes('latest'),
    reasoning: `Rule-based classifier assigned: ${type}`
  };
}

async function understandQuery(query) {
  const ruleIntent = ruleBasedClassify(query);
  if (ruleIntent.type !== 'unknown') {
      return ruleIntent;
  }
  
  // Groq Fallback
  const prompt = `
Analyze the academic query: "${query}"
Classify into exactly one: "title", "topic", "entity".
Return strict JSON:
{
  "type": "title|topic|entity",
  "searchQueries": ["query1"],
  "needsAnalysis": true,
  "needsSummary": false,
  "needsCitations": true,
  "recencyBias": false,
  "reasoning": "..."
}`;
  try {
    const text = await callGroq(prompt, 600);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return parsed;
  } catch (e) {
    console.warn('Intent classification failed, using fallback:', e.message);
    ruleIntent.type = 'topic';
    return ruleIntent;
  }
}

async function suggestFallbackEntities(query) {
  const prompt = `
You are helping recover a failed academic paper search for: "${query}"
Return strict JSON:
{
  "entityType": "concept",
  "subTopics": ["topic 1", "topic 2", "topic 3"],
  "reasoning": "..."
}`
  try {
    const text = await callGroq(prompt, 300);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const subTopics = Array.isArray(parsed.subTopics) ? parsed.subTopics.map(String).slice(0, 5) : [];
    if (subTopics.length > 0) return { entityType: parsed.entityType || 'concept', subTopics, reasoning: parsed.reasoning };
  } catch (e) {}
  
  const words = (query.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter(w => !['research', 'paper', 'papers', 'latest', 'recent', 'about'].includes(w));
  const seed = words.slice(0, 2).join(' ') || query.trim();
  return {
    entityType: 'concept',
    subTopics: [`${seed} methods`, `${seed} applications`, `${seed} benchmark`, `${seed} survey`],
    reasoning: 'Fallback entity suggestions from keyword extraction.'
  }
}

export async function runOrchestrator(query, sessionName, onTraceUpdate, filters = {}) {
  clearTrace()
  const session = createSession()
  session.name = sessionName || query
  session.query = query
  saveSession(session)

  const log = (agent, status, message, duration = null) => {
    console.log(`[${agent}] ${status}: ${message}`);
    addTraceStep({ agent, status, message, duration })
    if (onTraceUpdate) onTraceUpdate(getTrace())
  }

  try {
    log('orchestrator', 'running', `[ROUTING] Analyzing input vector: "${query}"`)
    const intent = await understandQuery(query)
    session.mode = intent.type
    // REQUIRED LOGGING
    log('orchestrator', 'done', `[INTENT CLASSIFIED] Type: ${intent.type.toUpperCase()} | Analysis: ${intent.needsAnalysis} | Summary: ${intent.needsSummary} | Citations: ${intent.needsCitations} | Engine: ${intent.reasoning.includes('Rule') ? 'Rule-Based' : 'LLM Fallback'}`)

    if (intent.type === 'entity') {
      let subTopics = intent.subTopics || [];
      if (subTopics.length === 0) {
          const fb = await suggestFallbackEntities(query);
          subTopics = fb.subTopics || [`${query} research`];
      }
      session.entityMeta = { type: intent.entityType || 'concept', subTopics };
      updateSession(session.id, { mode: session.mode, entityMeta: session.entityMeta });
      log('orchestrator', 'running', `Entity identified. Auto-extracting topics: ${subTopics.join(', ')}`);
      return await continueEntityRun(session.id, subTopics, onTraceUpdate);
    }

    const queries = intent.searchQueries || [query]
    log('discovery', 'running', `[DISCOVERY INIT] Launching concurrent fetch queries: ${queries.map(q => `"${q}"`).join(', ')}`)

    const discStart = Date.now()
    const allPapers = []
    for (const q of queries) {
      try {
        const papers = await DiscoveryAgent.run(q, 1)
        allPapers.push(...papers)
      } catch (e) {
        log('discovery', 'error', `Failed for "${q}": ${e.message}`)
      }
    }

    // deduplicateAndMerge handles exact match preservation and DOI + normalized title matching
    // DiscoveryAgent already deduplicates internally within one query, but Orchestrator resolves multiple queries.
    const unique = deduplicateAndMerge(allPapers)

    // Score using the Hybrid Ranking system
    let papers = unique.map(p => ({
        ...p,
        relevanceScore: hybridRank(p, query)
    }))
    
    // Sort initially by semantic ranking (hybridRank)
    papers.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Apply Smart Filters (Task 7)
    papers = applySmartFilters(papers, filters)

    const exactMatches = papers.filter(p => p.isExactMatch).length
    const sourceCounts = papers.reduce((acc, p) => {
      acc[p.source] = (acc[p.source] || 0) + 1
      return acc
    }, {})

    log('discovery', 'done',
      `[MERGE COMPLETE] Target space resolved. Unique Papers: ${papers.length}. Exact Top-Tier Hits: ${exactMatches}. Dist: ${JSON.stringify(sourceCounts)}`,
      Date.now() - discStart)

    // Smart Fallback
    const weakResults = papers.length === 0 || (papers.length < 3 && papers[0]?.relevanceScore < 0.2 && !papers[0]?.isExactMatch)
    if (weakResults) {
      const fallback = await suggestFallbackEntities(query)
      const fallbackIntent = {
        ...intent,
        type: 'entity',
        isEntity: true,
        entityType: fallback.entityType,
        subTopics: fallback.subTopics,
        reasoning: `${intent.reasoning} | Fallback triggered: ${fallback.reasoning}`
      }

      session.mode = 'entity'
      session.entityMeta = { type: fallbackIntent.entityType, subTopics: fallbackIntent.subTopics }
      updateSession(session.id, { mode: session.mode, entityMeta: session.entityMeta })

      log('orchestrator', 'running', `Discovery results weak. Auto-extracting fallback topics...`)
      return await continueEntityRun(session.id, fallbackIntent.subTopics, onTraceUpdate)
    }

    session.papers = papers
    updateSession(session.id, { papers })

    let analyses = {}
    if (intent.needsAnalysis) {
      const anaStart = Date.now()
      log('analysis', 'running', 'Analysis running...')
      analyses = AnalysisAgent.run(papers)
      log('analysis', 'done', 'Trend, author, keyword, citation analysis complete.', Date.now() - anaStart)
      session.analyses = analyses
      updateSession(session.id, { analyses })
    }

    let summaries = {}
    if (intent.needsSummary && papers.length > 0) {
      const sumStart = Date.now()
      log('summarization', 'running', 'Summarizing top paper...')
      const summary = await SummarizationAgent.summarizePaper(papers[0])
      summaries[papers[0].id] = summary
      session.summaries = summaries
      updateSession(session.id, { summaries })
      log('summarization', 'done', `Auto-summarized: "${papers[0].title.slice(0, 50)}..."`, Date.now() - sumStart)
    }

    let citations = {}
    if (intent.needsCitations) {
      log('citation', 'running', 'Generating citations...')
      for (const paper of papers) {
        citations[paper.id] = CitationAgent.generateAll(paper)
      }
      log('citation', 'done', `Generated citations for ${papers.length} papers.`)
    }

    session.citations = citations
    updateSession(session.id, { citations, summaries, trace: getTrace() })

    return {
      status: 'done',
      sessionId: session.id,
      papers,
      analyses,
      citations,
      summaries,
      intent,
      trace: getTrace()
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

export async function continueEntityRun(sessionId, subTopics, onTraceUpdate) {
  const { updateSession } = await import('../store/sessionStore')
  clearTrace()

  const log = (agent, status, message, duration = null) => {
    addTraceStep({ agent, status, message, duration })
    if (onTraceUpdate) onTraceUpdate(getTrace())
  }

  log('orchestrator', 'running', `Entity confirmed. Searching ${subTopics.length} sub-topics...`)

  const allPapers = []
  for (const topic of subTopics) {
    const start = Date.now()
    log('discovery', 'running', `Fetching: "${topic}"`)
    try {
      const papers = await DiscoveryAgent.run(topic)
      papers.forEach(p => p.subTopic = topic)
      allPapers.push(...papers)
      log('discovery', 'done', `${papers.length} papers for "${topic}"`, Date.now() - start)
    } catch (e) {
      log('discovery', 'error', `Failed for "${topic}": ${e.message}`)
    }
  }

  let merged = deduplicateAndMerge(allPapers)
  merged.forEach(p => p.relevanceScore = hybridRank(p, `${subTopics.join(" ")}`))
  merged.sort((a, b) => b.relevanceScore - a.relevanceScore)

  let analyses = {}
  if (merged.length > 0) {
    analyses = AnalysisAgent.run(merged)
  }

  const citations = {}
  for (const paper of merged) {
    citations[paper.id] = CitationAgent.generateAll(paper)
  }

  const trace = getTrace()
  updateSession(sessionId, { papers: merged, analyses, citations, trace })

  return {
    status: 'done',
    sessionId,
    papers: merged,
    analyses,
    citations,
    trace,
    fallbackExhausted: merged.length === 0
  }
}