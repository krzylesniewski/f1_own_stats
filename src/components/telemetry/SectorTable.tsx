import type { Driver, Lap } from '../../api/types'
import { formatDuration } from '../../format'

interface Row {
  driver: number
  bestLap: number | null
  s1: number | null
  s2: number | null
  s3: number | null
  i1: number | null
  i2: number | null
  st: number | null
}

type Column = Exclude<keyof Row, 'driver'>

const min = (values: (number | null)[]) => {
  const v = values.filter((x): x is number => x !== null && x > 0)
  return v.length ? Math.min(...v) : null
}
const max = (values: (number | null)[]) => {
  const v = values.filter((x): x is number => x !== null)
  return v.length ? Math.max(...v) : null
}

/** Personal bests per driver across the whole session (each sector may come from a different lap). */
function buildRows(laps: Lap[]): Row[] {
  const byDriver = new Map<number, Lap[]>()
  for (const l of laps) byDriver.set(l.driver_number, [...(byDriver.get(l.driver_number) ?? []), l])
  return [...byDriver].map(([driver, ls]) => ({
    driver,
    bestLap: min(ls.map((l) => l.lap_duration)),
    s1: min(ls.map((l) => l.duration_sector_1)),
    s2: min(ls.map((l) => l.duration_sector_2)),
    s3: min(ls.map((l) => l.duration_sector_3)),
    i1: max(ls.map((l) => l.i1_speed)),
    i2: max(ls.map((l) => l.i2_speed)),
    st: max(ls.map((l) => l.st_speed)),
  }))
}

const TIME_COLUMNS: Column[] = ['bestLap', 's1', 's2', 's3']
const SPEED_COLUMNS: Column[] = ['i1', 'i2', 'st']

export default function SectorTable({ laps, drivers }: { laps: Lap[]; drivers: Map<number, Driver> }) {
  const rows = buildRows(laps).sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity))
  const sessionBest = Object.fromEntries([
    ...TIME_COLUMNS.map((c) => [c, min(rows.map((r) => r[c]))]),
    ...SPEED_COLUMNS.map((c) => [c, max(rows.map((r) => r[c]))]),
  ]) as Record<Column, number | null>

  const cell = (r: Row, c: Column) => {
    const v = r[c]
    if (v === null) return <span className="text-neutral-600">—</span>
    const text = TIME_COLUMNS.includes(c) ? formatDuration(v) : v
    return v === sessionBest[c] ? (
      <span className="rounded bg-violet-500/25 px-1.5 py-0.5 text-violet-100" title="Najlepszy w sesji">
        {text}
      </span>
    ) : (
      text
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-neutral-500">
          <tr className="border-b border-neutral-800">
            <th className="py-2 pr-3 font-normal">Kierowca</th>
            <th className="py-2 pr-3 text-right font-normal">Najlepsze okr.</th>
            <th className="py-2 pr-3 text-right font-normal">S1</th>
            <th className="py-2 pr-3 text-right font-normal">S2</th>
            <th className="py-2 pr-3 text-right font-normal">S3</th>
            <th className="py-2 pr-3 text-right font-normal" title="Suma najlepszych sektorów kierowcy">
              Idealne okr.
            </th>
            <th className="py-2 pr-3 text-right font-normal">I1 km/h</th>
            <th className="py-2 pr-3 text-right font-normal">I2 km/h</th>
            <th className="py-2 text-right font-normal">Speed trap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {rows.map((r) => {
            const d = drivers.get(r.driver)
            const ideal = r.s1 && r.s2 && r.s3 ? r.s1 + r.s2 + r.s3 : null
            const lost = ideal && r.bestLap ? r.bestLap - ideal : null
            return (
              <tr key={r.driver}>
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full" style={{ backgroundColor: `#${d?.team_colour ?? '555'}` }} />
                    {d?.name_acronym ?? `#${r.driver}`}
                  </span>
                </td>
                {TIME_COLUMNS.map((c) => (
                  <td key={c} className="py-2 pr-3 text-right tabular-nums">
                    {cell(r, c)}
                  </td>
                ))}
                <td className="py-2 pr-3 text-right tabular-nums text-neutral-300">
                  {ideal ? formatDuration(ideal) : '—'}
                  {lost !== null && lost > 0.0005 && (
                    <span className="ml-1 text-xs text-neutral-500">(−{lost.toFixed(3)})</span>
                  )}
                </td>
                {SPEED_COLUMNS.map((c) => (
                  <td key={c} className={`py-2 text-right tabular-nums ${c === 'st' ? '' : 'pr-3'}`}>
                    {cell(r, c)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-500">
        Najlepsze sektory i prędkości z całej sesji, nie tylko z najszybszego okrążenia.{' '}
        <span className="rounded bg-violet-500/25 px-1 text-violet-100">Fiolet</span> = najlepszy wynik sesji. W
        nawiasie: ile kierowca zyskałby, łącząc swoje najlepsze sektory.
      </p>
    </div>
  )
}
