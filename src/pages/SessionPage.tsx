import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useDrivers, useMeeting, useSession, useSessionResult, useTeamRadio } from '../api/queries'
import type { Driver, SessionResult } from '../api/types'
import QualiTelemetry from '../components/telemetry/QualiTelemetry'
import { formatDateTime, formatDuration, formatGap, formatTime } from '../format'

const QUALI_PARTS = ['Q1', 'Q2', 'Q3']

function statusLabel(r: SessionResult) {
  if (r.dsq) return 'DSQ'
  if (r.dns) return 'DNS'
  if (r.dnf) return 'DNF'
  return null
}

/** Leader shows their own time, everyone else shows the gap. */
function timeOrGap(duration: number | null | undefined, gap: number | string | null | undefined) {
  if (gap === 0 && typeof duration === 'number') return formatDuration(duration)
  if (gap !== null && gap !== undefined) return formatGap(gap)
  if (typeof duration === 'number') return formatDuration(duration)
  return '—'
}

function DriverCell({ driver, number }: { driver?: Driver; number: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-1 rounded-full" style={{ backgroundColor: `#${driver?.team_colour ?? '555'}` }} />
      <span className="w-6 text-right text-xs text-neutral-500">{number}</span>
      <span>{driver?.full_name ?? `#${number}`}</span>
    </span>
  )
}

export default function SessionPage() {
  const { year, meetingKey, sessionKey } = useParams()
  const key = Number(sessionKey)
  const { data: meeting } = useMeeting(Number(meetingKey))
  const { data: session, error: sessionError } = useSession(key)
  const { data: results, isLoading: resultsLoading, error: resultsError } = useSessionResult(key)
  const { data: drivers } = useDrivers(key)

  const driverByNumber = new Map(drivers?.map((d) => [d.driver_number, d]))
  const sorted = [...(results ?? [])].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity))
  const isQuali = sorted.some((r) => Array.isArray(r.duration))
  const hasPoints = sorted.some((r) => r.points !== undefined)

  const top3 = sorted.filter((r) => r.position !== null && r.position <= 3).map((r) => r.driver_number)
  const { data: radio, isLoading: radioLoading, error: radioError } = useTeamRadio(key, top3)

  const error = sessionError ?? resultsError
  const [searchParams, setSearchParams] = useSearchParams()
  const hasTelemetryTab = session?.session_type === 'Qualifying'
  const tab = hasTelemetryTab && searchParams.get('tab') === 'telemetry' ? 'telemetry' : 'results'
  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 px-1 pb-2 text-sm ${active ? 'border-neutral-100 text-neutral-100' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`

  return (
    <>
      <Link to={`/${year}/${meetingKey}`} className="text-sm text-neutral-400 hover:text-neutral-100">
        ‹ {meeting?.meeting_name ?? 'Weekend'}
      </Link>

      {error && <p className="mt-6 text-red-400">{error.message}</p>}
      {session === null && <p className="mt-6 text-neutral-400">Nie znaleziono sesji.</p>}

      {session && (
        <header className="mt-4">
          <h1 className="text-2xl font-semibold">{session.session_name}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {meeting?.meeting_name} · {session.circuit_short_name} · {formatDateTime(session.date_start)}
          </p>
        </header>
      )}

      {hasTelemetryTab && (
        <nav className="mt-6 flex gap-6 border-b border-neutral-800">
          <button className={tabClass(tab === 'results')} onClick={() => setSearchParams({})}>
            Wyniki
          </button>
          <button className={tabClass(tab === 'telemetry')} onClick={() => setSearchParams({ tab: 'telemetry' })}>
            Telemetria
          </button>
        </nav>
      )}

      {tab === 'telemetry' && <QualiTelemetry sessionKey={key} results={sorted} drivers={driverByNumber} />}

      {tab === 'results' && (
        <>
          <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-400">Wyniki</h2>
          {resultsLoading && <p className="mt-3 text-neutral-400">Ładowanie…</p>}
          {results?.length === 0 && <p className="mt-3 text-neutral-400">Brak wyników dla tej sesji.</p>}

          {sorted.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-neutral-500">
                  <tr className="border-b border-neutral-800">
                    <th className="py-2 pr-3 font-normal">Poz.</th>
                    <th className="py-2 pr-3 font-normal">Kierowca</th>
                    <th className="py-2 pr-3 font-normal">Zespół</th>
                    {isQuali ? (
                      QUALI_PARTS.map((q) => (
                        <th key={q} className="py-2 pr-3 text-right font-normal">
                          {q}
                        </th>
                      ))
                    ) : (
                      <th className="py-2 pr-3 text-right font-normal">Czas / strata</th>
                    )}
                    <th className="py-2 pr-3 text-right font-normal">Okr.</th>
                    {hasPoints && <th className="py-2 text-right font-normal">Pkt</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {sorted.map((r) => {
                    const driver = driverByNumber.get(r.driver_number)
                    const status = statusLabel(r)
                    return (
                      <tr key={r.driver_number}>
                        <td className="py-2 pr-3 tabular-nums">
                          {r.position ?? <span className="text-neutral-500">{status ?? '—'}</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <DriverCell driver={driver} number={r.driver_number} />
                        </td>
                        <td className="py-2 pr-3 text-neutral-400">{driver?.team_name}</td>
                        {isQuali ? (
                          QUALI_PARTS.map((q, i) => {
                            const durations = Array.isArray(r.duration) ? r.duration : []
                            const gaps = Array.isArray(r.gap_to_leader) ? r.gap_to_leader : []
                            return (
                              <td key={q} className="py-2 pr-3 text-right tabular-nums">
                                {timeOrGap(durations[i], gaps[i])}
                              </td>
                            )
                          })
                        ) : (
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {status && r.position !== null
                              ? status
                              : timeOrGap(
                                  typeof r.duration === 'number' ? r.duration : null,
                                  Array.isArray(r.gap_to_leader) ? null : r.gap_to_leader,
                                )}
                          </td>
                        )}
                        <td className="py-2 pr-3 text-right tabular-nums text-neutral-400">
                          {r.number_of_laps ?? '—'}
                        </td>
                        {hasPoints && <td className="py-2 text-right tabular-nums">{r.points || ''}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {top3.length > 0 && (
            <>
              <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-neutral-400">Team radio · top 3</h2>
              {radioLoading && <p className="mt-3 text-neutral-400">Ładowanie…</p>}
              {radioError && <p className="mt-3 text-red-400">{radioError.message}</p>}

              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {top3.map((number, i) => {
                  const driver = driverByNumber.get(number)
                  const messages = (radio ?? [])
                    .filter((m) => m.driver_number === number)
                    .sort((a, b) => a.date.localeCompare(b.date))
                  return (
                    <section key={number} className="rounded-lg border border-neutral-800 p-3">
                      <h3 className="flex items-center justify-between gap-2 font-medium">
                        <DriverCell driver={driver} number={number} />
                        <span className="text-xs text-neutral-500">P{i + 1}</span>
                      </h3>
                      {radio && messages.length === 0 && (
                        <p className="mt-3 text-sm text-neutral-500">Brak nagrań w tej sesji.</p>
                      )}
                      <ul className="mt-3 space-y-3">
                        {messages.map((m) => (
                          <li key={m.recording_url}>
                            <span className="text-xs text-neutral-500">{formatTime(m.date)}</span>
                            <audio controls preload="none" src={m.recording_url} className="mt-1 h-8 w-full" />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
