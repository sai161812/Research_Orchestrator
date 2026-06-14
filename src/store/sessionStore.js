const SESSIONS_KEY = 'orchestrix_sessions'

// Get all sessions
export const getSessions = () => {
  const raw = localStorage.getItem(SESSIONS_KEY)
  return raw ? JSON.parse(raw) : []
}

// Get one session by id
export const getSessionById = (id) => {
  return getSessions().find(s => s.id === id) || null
}

// Save a new session
export const saveSession = (session) => {
  const sessions = getSessions()
  sessions.unshift(session)           // newest first
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

// Update existing session (merge changes)
export const updateSession = (id, changes) => {
  const sessions = getSessions().map(s =>
    s.id === id ? { ...s, ...changes } : s
  )
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

// Delete a session
export const deleteSession = (id) => {
  const sessions = getSessions().filter(s => s.id !== id)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

const ACTIVE_SESSION_KEY = 'orchestrix_active_session'

export const getActiveSessionId = () => {
  return localStorage.getItem(ACTIVE_SESSION_KEY) || null
}

export const setActiveSessionId = (id) => {
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY)
  }
}