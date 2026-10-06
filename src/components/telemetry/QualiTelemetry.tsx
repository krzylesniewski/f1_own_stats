import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLaps, useLapTelemetry } from '../../api/queries'
import type { Driver, SessionResult } from '../../api/types'
import { formatDuration } from '../../format'
import { bestLap, compareLaps } from '../../telemetry'
import { DASH_B, driverColors } from './colors'
import LapCharts from './LapCharts'
import SectorTable from './SectorTable'
import TrackMap from './TrackMap'
import QueryFeedback from '../QueryFeedback'

interface Props {
  sessionKey: number
  dateEnd: string
  results: SessionResult[]
  drivers: Map<number, Driver>
}

const SECTION_TITLE = 'mt-8 text-sm font-medium uppercase tracking-wide text-neutral-400'
const SELECT =
  'rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 disabled:opacity-50'

export default function QualiTelemetry({ sessionKey, dateEnd, results, drivers }: Props) {
  const { data: laps, isPending, error, refetch } = useLaps(sessionKey, dateEnd)
  const [searchParams, setSearchParams] = useSearchParams()

  // Drivers in classification order, limited to those with a usable timed lap.
  const options = useMemo(() => {
    if (!laps) return []
    const classified = results.map((r) => r.driver_number)
    const numbers = classified.length ? classified : [...new Set(laps.map((l) => l.driver_number))]
    return numbers
      .filter((n) => bestLap(laps, n))
      .sort((a, b) => {
        if (classified.length) return classified.indexOf(a) - classified.indexOf(b)
        return bestLap(laps, a)!.lap_duration! - bestLap(laps, b)!.lap_duration!
      })
  }, [laps, results])
  const requestedA = Number(searchParams.get('a'))
  const requestedB = Number(searchParams.get('b'))
  const numA = options.includes(requestedA) ? requestedA : options[0]
  const numB = options.includes(requestedB) && requestedB !== numA ? requestedB : options.find((n) => n !== numA)

  const lapA = useMemo(() => (laps && numA !== undefined ? bestLap(laps, numA) : undefined), [laps, numA])
  const lapB = useMemo(() => (laps && numB !== undefined ? bestLap(laps, numB) : undefined), [laps, numB])
  const telA = useLapTelemetry(lapA)
  const telB = useLapTelemetry(lapB)

  const comparison = useMemo(
    () => (lapA && lapB && telA.data && telB.data ? compareLaps(lapA, telA.data, lapB, telB.data) : null),
    [lapA, lapB, telA.data, telB.data],
  )

  if (isPending || error)
    return <QueryFeedback loading={isPending} error={error} retry={() => refetch()} loadingText="Ładowanie okrążeń…" />
  if (!laps?.length || options.length < 2) return <p className="mt-6 text-neutral-400">Brak danych o okrążeniach.</p>

  const driverA = numA !== undefined ? drivers.get(numA) : undefined
  const driverB = numB !== undefined ? drivers.get(numB) : undefined
  const colors = driverColors(driverA, driverB)
  const names = { A: driverA?.name_acronym ?? `#${numA}`, B: driverB?.name_acronym ?? `#${numB}` }
  const telemetryLoading = telA.isLoading || telB.isLoading
  const telemetryError = telA.error ?? telB.error
  const gap = lapA?.lap_duration && lapB?.lap_duration ? lapB.lap_duration - lapA.lap_duration : null

  const picker = (slot: 'A' | 'B') => (
    <label className="flex items-center gap-2 text-sm text-neutral-400">
      <svg width="20" height="6" aria-hidden>
        <line
          x1="0"
          y1="3"
          x2="20"
          y2="3"
          stroke={colors[slot]}
          strokeWidth="3"
          strokeDasharray={slot === 'B' ? DASH_B : undefined}
        />
      </svg>
      <select
        className={SELECT}
        value={slot === 'A' ? numA : numB}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams)
          next.set('a', String(slot === 'A' ? Number(e.target.value) : numA))
          next.set('b', String(slot === 'B' ? Number(e.target.value) : numB))
          setSearchParams(next)
        }}
      >
        {options.map((n) => (
          <option key={n} value={n} disabled={n === (slot === 'A' ? numB : numA)}>
            {drivers.get(n)?.full_name ?? `#${n}`} · {formatDuration(bestLap(laps, n)!.lap_duration!)}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <>
      <h2 className={SECTION_TITLE}>Porównanie najszybszych okrążeń</h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {picker('A')}
        <span className="text-xs text-neutral-500">vs</span>
        {picker('B')}
        {gap !== null && (
          <span className="text-sm text-neutral-300 tabular-nums">
            {names.B} {gap >= 0 ? '+' : ''}
            {gap.toFixed(3)} s
          </span>
        )}
      </div>

      <QueryFeedback
        loading={telemetryLoading}
        error={telemetryError}
        retry={() => {
          void telA.refetch()
          void telB.refetch()
        }}
        loadingText="Ładowanie telemetrii…"
      />
      {!telemetryLoading && !telemetryError && !comparison && (
        <p className="mt-6 text-neutral-400">Brak telemetrii dla tych okrążeń.</p>
      )}

      {comparison && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <LapCharts trace={comparison.trace} colors={colors} names={names} />
          <div>
            <h3 className="mb-2 text-xs text-neutral-400">Kto gdzie szybszy</h3>
            <TrackMap segments={comparison.segments} colors={colors} names={names} />
            <p className="mt-4 text-xs text-neutral-500">
              Dystans liczony z prędkości (OpenF1 go nie podaje), więc wykresy są przybliżone. Telemetria próbkowana
              ~3,7 Hz.
            </p>
          </div>
        </div>
      )}

      <h2 className={SECTION_TITLE}>Sektory i prędkości</h2>
      <div className="mt-2">
        <SectorTable laps={laps} drivers={drivers} />
      </div>
    </>
  )
}
