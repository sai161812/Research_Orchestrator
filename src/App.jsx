import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ResearchPage from './pages/ResearchPage'
import DashboardPage from './pages/DashboardPage'
import SessionsPage from './pages/SessionsPage'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#04040a' }}>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <Routes>
          <Route path="/" element={<ResearchPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
        </Routes>
      </main>
    </div>
  )
}