import { Navigate, Route, Routes } from 'react-router-dom'
import { CURRENT_YEAR } from './format'
import MeetingPage from './pages/MeetingPage'
import MeetingsPage from './pages/MeetingsPage'
import SessionPage from './pages/SessionPage'

export default function App() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <Routes>
          <Route path="/" element={<Navigate to={`/${CURRENT_YEAR}`} replace />} />
          <Route path="/:year" element={<MeetingsPage />} />
          <Route path="/:year/:meetingKey" element={<MeetingPage />} />
          <Route path="/:year/:meetingKey/:sessionKey" element={<SessionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
  )
}
