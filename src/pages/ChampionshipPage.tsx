import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useChampionshipDrivers, useChampionshipTeams, useDrivers, useMeetings, useRaceSessions } from '../api/queries'
import QueryFeedback from '../components/QueryFeedback'

export default function ChampionshipPage() {
  const year = Number(useParams().year)
  const [now] = useState(() => Date.now())
  const meetings = useMeetings(year)
  const sessions = useRaceSessions(year)
  const race = [...(sessions.data ?? [])]
    .filter((s) => s.session_type === 'Race' && !s.is_cancelled && Date.parse(s.date_end) < now)
    .sort((a, b) => b.date_end.localeCompare(a.date_end))[0]
  const latestMeeting = meetings.data?.find((m) => m.meeting_key === race?.meeting_key)
  const drivers = useDrivers(race?.session_key, race?.date_end)
  const driverStandings = useChampionshipDrivers(race?.session_key, race?.date_end)
  const teamStandings = useChampionshipTeams(race?.session_key, race?.date_end)
  const names = new Map(drivers.data?.map((d) => [d.driver_number, d]))

  return (
    <>
      <Link to={`/${year}`} className="text-sm text-neutral-400 hover:text-white">
        ‹ Sezon {year}
      </Link>
      <header className="mt-4">
        <h1 className="text-2xl font-semibold">Klasyfikacja mistrzostw {year}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Stan po {latestMeeting?.meeting_name ?? 'ostatnim zakończonym wyścigu'}. Dane OpenF1 są oznaczone jako beta.
        </p>
      </header>
      <QueryFeedback
        loading={meetings.isPending || sessions.isPending}
        error={meetings.error ?? sessions.error}
        retry={() => {
          void meetings.refetch()
          void sessions.refetch()
        }}
        empty={!meetings.isPending && !sessions.isPending && !race}
        loadingText="Szukanie ostatniego wyścigu…"
        emptyText="Brak zakończonego wyścigu w tym sezonie."
      />
      {race && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold">Kierowcy</h2>
            <QueryFeedback
              loading={driverStandings.isPending}
              error={driverStandings.error}
              retry={() => driverStandings.refetch()}
              empty={driverStandings.data?.length === 0}
              loadingText="Ładowanie klasyfikacji kierowców…"
              emptyText="Klasyfikacja nie została jeszcze opublikowana."
            />
            {!!driverStandings.data?.length && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-800 text-left text-neutral-400">
                    <tr>
                      <th className="py-2">Poz.</th>
                      <th>Kierowca</th>
                      <th className="text-right">Pkt</th>
                      <th className="text-right">Zmiana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {[...driverStandings.data]
                      .sort((a, b) => a.position_current - b.position_current)
                      .map((row) => (
                        <tr key={row.driver_number}>
                          <td className="py-2">{row.position_current}</td>
                          <td>{names.get(row.driver_number)?.full_name ?? `#${row.driver_number}`}</td>
                          <td className="text-right tabular-nums">{row.points_current}</td>
                          <td className="text-right tabular-nums text-neutral-400">
                            {row.points_current - row.points_start > 0 ? '+' : ''}
                            {row.points_current - row.points_start}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section>
            <h2 className="text-lg font-semibold">Zespoły</h2>
            <QueryFeedback
              loading={teamStandings.isPending}
              error={teamStandings.error}
              retry={() => teamStandings.refetch()}
              empty={teamStandings.data?.length === 0}
              loadingText="Ładowanie klasyfikacji zespołów…"
              emptyText="Klasyfikacja nie została jeszcze opublikowana."
            />
            {!!teamStandings.data?.length && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-800 text-left text-neutral-400">
                    <tr>
                      <th className="py-2">Poz.</th>
                      <th>Zespół</th>
                      <th className="text-right">Pkt</th>
                      <th className="text-right">Zmiana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {[...teamStandings.data]
                      .sort((a, b) => a.position_current - b.position_current)
                      .map((row) => (
                        <tr key={row.team_name}>
                          <td className="py-2">{row.position_current}</td>
                          <td>{row.team_name}</td>
                          <td className="text-right tabular-nums">{row.points_current}</td>
                          <td className="text-right tabular-nums text-neutral-400">
                            {row.points_current - row.points_start > 0 ? '+' : ''}
                            {row.points_current - row.points_start}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
