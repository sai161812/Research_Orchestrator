// Trace is kept in memory during a session run
// then saved into the session object at the end

let currentTrace = []

export const clearTrace = () => {
  currentTrace = []
}

export const addTraceStep = (step) => {
  const entry = {
    step: currentTrace.length + 1,
    agent: step.agent,
    status: step.status,       // 'running' | 'done' | 'error'
    message: step.message,
    duration: step.duration || null,
    timestamp: Date.now()
  }
  currentTrace.push(entry)
  return entry
}

export const getTrace = () => [...currentTrace]