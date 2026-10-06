import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CURRENT_YEAR, FIRST_YEAR } from './format'
import ChampionshipPage from './pages/ChampionshipPage'
import MeetingPage from './pages/MeetingPage'
import MeetingsPage from './pages/MeetingsPage'
import SessionPage from './pages/SessionPage'

const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)

function Validated({ children }: { children: React.ReactNode }) {
  const { year, meetingKey, sessionKey } = useParams()
  const validNumber = (value?: string) =>
    value === undefined || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0)
  if (
    !validNumber(year) ||
    !validNumber(meetingKey) ||
    !validNumber(sessionKey) ||
    Number(year) < FIRST_YEAR ||
    Number(year) > CURRENT_YEAR
  ) {
    return <Navigate to="/" replace />
  }
  return children
}

function SiteNavigation() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const requestedYear = Number(pathname.split('/')[1])
  const year =
    Number.isInteger(requestedYear) && requestedYear >= FIRST_YEAR && requestedYear <= CURRENT_YEAR
      ? requestedYear
      : CURRENT_YEAR
  const championshipPath = `/${year}/championship`
  const onChampionship = pathname === championshipPath
  const linkClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`

  return (
    <header className="mb-8 grid grid-cols-[1fr_auto] items-center gap-4 border-b border-neutral-800 pb-4 sm:grid-cols-[1fr_auto_auto]">
      <Link to="/" className="justify-self-start text-lg font-semibold tracking-tight hover:text-sky-300">
        F1 Stats
      </Link>
      <nav aria-label="Nawigacja główna" className="col-span-2 row-start-2 flex flex-wrap gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <Link
          to={year === CURRENT_YEAR ? '/' : `/${year}`}
          className={linkClass(!onChampionship)}
          aria-current={pathname === '/' || pathname === `/${year}` ? 'page' : undefined}
        >
          Weekendy
        </Link>
        <Link
          to={championshipPath}
          className={linkClass(onChampionship)}
          aria-current={onChampionship ? 'page' : undefined}
        >
          Klasyfikacja
        </Link>
      </nav>
      <label className="col-start-2 row-start-1 flex items-center gap-2 text-sm text-neutral-400 sm:col-start-3">
        Sezon
        <select
          value={year}
          onChange={(e) => navigate(onChampionship ? `/${e.target.value}/championship` : `/${e.target.value}`)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </header>
  )
}

export default function App() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <SiteNavigation />
        <Routes>
          <Route path="/" element={<MeetingsPage />} />
          <Route
            path="/:year"
            element={
              <Validated>
                <MeetingsPage />
              </Validated>
            }
          />
          <Route
            path="/:year/championship"
            element={
              <Validated>
                <ChampionshipPage />
              </Validated>
            }
          />
          <Route
            path="/:year/:meetingKey"
            element={
              <Validated>
                <MeetingPage />
              </Validated>
            }
          />
          <Route
            path="/:year/:meetingKey/:sessionKey"
            element={
              <Validated>
                <SessionPage />
              </Validated>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
  )
}
