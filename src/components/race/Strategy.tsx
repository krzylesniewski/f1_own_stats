import { usePitStops, useStints } from '../../api/queries'
import type { Driver, SessionResult } from '../../api/types'
import QueryFeedback from '../QueryFeedback'

const COMPOUND: Record<string, string> = {
  SOFT: '#ef4444',
  MEDIUM: '#facc15',
  HARD: '#e5e5e5',
  INTERMEDIATE: '#22c55e',
  WET: '#3b82f6',
}

export default function Strategy({
  sessionKey,
  dateEnd,
  results,
  drivers,
}: {
  sessionKey: number
  dateEnd: string
  results: SessionResult[]
  drivers: Map<number, Driver>
}) {
  const stints = useStints(sessionKey, dateEnd)
  const pits = usePitStops(sessionKey, dateEnd)
  const maxLap = Math.max(
    1,
    ...results.map((r) => r.number_of_laps ?? 0),
    ...(stints.data ?? []).map((s) => s.lap_end ?? s.lap_start),
  )
  const numbers = [...new Set((stints.data ?? []).map((s) => s.driver_number))].sort(
    (a, b) =>
      (results.find((r) => r.driver_number === a)?.position ?? 99) -
      (results.find((r) => r.driver_number === b)?.position ?? 99),
  )

  return (
    <section className="mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Strategia opon</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Mieszanki i długość stintów według okrążenia. Kropki oznaczają przejazdy przez pit lane.
        </p>
        <QueryFeedback
          loading={stints.isPending}
          error={stints.error}
          retry={() => stints.refetch()}
          empty={stints.data?.length === 0}
          loadingText="Ładowanie stintów…"
          emptyText="Brak danych o oponach dla tego wyścigu."
        />
      </div>
      {numbers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-neutral-800 p-4">
          <div className="min-w-[600px] space-y-3">
            {numbers.map((number) => (
              <div key={number} className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm">
                <span className="truncate font-medium" title={drivers.get(number)?.full_name}>
                  {drivers.get(number)?.name_acronym ?? `#${number}`}
                </span>
                <div
                  className="relative h-7 rounded bg-neutral-900"
                  aria-label={`Strategia ${drivers.get(number)?.full_name ?? number}`}
                >
                  {stints.data
                    ?.filter((s) => s.driver_number === number)
                    .map((s) => {
                      const start = Math.max(1, s.lap_start)
                      const end = Math.max(start, s.lap_end ?? maxLap)
                      return (
                        <div
                          key={s.stint_number}
                          className="absolute top-1 h-5 overflow-hidden rounded px-1 text-center text-xs font-semibold text-neutral-950"
                          style={{
                            left: `${((start - 1) / maxLap) * 100}%`,
                            width: `${((end - start + 1) / maxLap) * 100}%`,
                            backgroundColor: COMPOUND[s.compound] ?? '#a3a3a3',
                          }}
                          title={`${s.compound}: okrążenia ${start}–${end}, wiek opon na starcie ${s.tyre_age_at_start ?? '—'}`}
                        >
                          {end - start > 3 ? s.compound[0] : ''}
                        </div>
                      )
                    })}
                  {pits.data
                    ?.filter((p) => p.driver_number === number)
                    .map((p, i) => (
                      <span
                        key={`${p.lap_number}-${i}`}
                        className="absolute -top-1 h-2 w-2 rounded-full border border-neutral-950 bg-sky-400"
                        style={{ left: `${((p.lap_number - 1) / maxLap) * 100}%` }}
                        title={`Pit: okrążenie ${p.lap_number}`}
                      />
                    ))}
                </div>
              </div>
            ))}
            <div className="ml-[5.75rem] flex justify-between text-xs text-neutral-500">
              <span>1</span>
              <span>Okrążenie {maxLap}</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-neutral-300">
        {Object.entries(COMPOUND).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
      </div>
      <div>
        <h3 className="font-medium">Pit stopy</h3>
        <QueryFeedback
          loading={pits.isPending}
          error={pits.error}
          retry={() => pits.refetch()}
          empty={pits.data?.length === 0}
          loadingText="Ładowanie pit stopów…"
          emptyText="Brak danych o pit stopach."
        />
        {!!pits.data?.length && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-800 text-left text-neutral-400">
                <tr>
                  <th className="py-2">Kierowca</th>
                  <th>Okr.</th>
                  <th>Czas w pit lane</th>
                  <th>Postój</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {[...pits.data]
                  .sort((a, b) => a.lap_number - b.lap_number)
                  .map((p, i) => (
                    <tr key={`${p.driver_number}-${p.lap_number}-${i}`}>
                      <td className="py-2">{drivers.get(p.driver_number)?.name_acronym ?? `#${p.driver_number}`}</td>
                      <td>{p.lap_number}</td>
                      <td>{p.lane_duration?.toFixed(1) ?? '—'} s</td>
                      <td>{p.stop_duration?.toFixed(1) ?? '—'} s</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-neutral-500">Czas samego postoju jest dostępny w OpenF1 od GP USA 2024.</p>
      </div>
    </section>
  )
}
