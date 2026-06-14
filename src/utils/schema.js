export const createPaper = () => ({
  id: '',
  title: '',
  doi: '',
  authors: [],
  year: null,
  abstract: '',
  url: '',
  citationCount: 0,
  source: '',
  relevanceScore: 0
})

export const createAgentOutput = () => ({
  agentId: '',
  status: 'pending',
  startTime: null,
  endTime: null,
  input: null,
  output: null,
  error: null
})

export const createTraceStep = () => ({
  step: 0,
  agent: '',
  status: '',
  message: '',
  duration: null,
  timestamp: null
})

export const createSession = () => ({
  id: crypto.randomUUID(),
  name: '',
  query: '',
  mode: '',
  entityMeta: null,
  timestamp: Date.now(),
  papers: [],
  analyses: {},
  summaries: {},
  citations: {},
  notes: '',
  trace: []
})