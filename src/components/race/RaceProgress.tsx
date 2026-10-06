import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useIntervals, useOvertakes, usePositions, useRaceControl } from '../../api/queries'
import type { Driver, SessionResult } from '../../api/types'
import { formatTime } from '../../format'
import QueryFeedback from '../QueryFeedback'

export default function RaceProgress({
  sessionKey,
  dateStart,
  dateEnd,
  results,
  drivers,
}: {
  sessionKey: number
  dateStart: string
  dateEnd: string
  results: SessionResult[]
  drivers: Map<number, Driver>
}) {
  const positions = usePositions(sessionKey, dateEnd)
  const control = useRaceControl(sessionKey, dateEnd)
  const overtakes = useOvertakes(sessionKey, dateEnd)
  const numbers = results.length
    ? results.map((r) => r.driver_number)
    : [...new Set((positions.data ?? []).map((p) => p.driver_number))]
  const [pickedA, setPickedA] = useState<number>()
  const [pickedB, setPickedB] = useState<number>()
  const a = numbers.includes(pickedA ?? -1) ? pickedA! : numbers[0]
  const b = numbers.includes(pickedB ?? -1) && pickedB !== a ? pickedB! : numbers.find((n) => n !== a)
  const intervals = useIntervals(sessionKey, a, dateEnd)
  const start = Date.parse(dateStart)
  const minutes = (date: string) => (Date.parse(date) - start) / 60_000
  const posPoints = (positions.data ?? [])
    .filter((p) => p.driver_number === a || p.driver_number === b)
    .map((p) => ({
      minute: minutes(p.date),
      a: p.driver_number === a ? p.position : null,
      b: p.driver_number === b ? p.position : null,
    }))
    .sort((x, y) => x.minute - y.minute)
  const maxPosition = Math.max(20, ...posPoints.map((p) => p.a ?? p.b ?? 0))
  const firstA = posPoints.find((p) => p.a !== null)?.a
  const lastA = posPoints.findLast((p) => p.a !== null)?.a
  const firstB = posPoints.find((p) => p.b !== null)?.b
  const lastB = posPoints.findLast((p) => p.b !== null)?.b
  const gapRaw = (intervals.data ?? []).filter((p) => typeof p.gap_to_leader === 'number')
  const step = Math.max(1, Math.ceil(gapRaw.length / 350))
  const gaps = gapRaw
    .filter((_, i) => i % step === 0)
    .map((p) => ({ minute: minutes(p.date), gap: p.gap_to_leader as number }))
  const select = (value: number | undefined, onChange: (value: number) => void, label: string) => (
    <label className="flex items-center gap-2 text-sm text-neutral-400">
      {label}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
      >
        {numbers.map((n) => (
          <option key={n} value={n}>
            {drivers.get(n)?.full_name ?? `#${n}`}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="mt-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Przebieg wyścigu</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Zmiany pozycji i strata do lidera względem czasu od rozpoczęcia sesji.
        </p>
        {numbers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {select(a, setPickedA, 'Kierowca A')}
            {b && select(b, setPickedB, 'Kierowca B')}
          </div>
        )}
        <QueryFeedback
          loading={positions.isPending}
          error={positions.error}
          retry={() => positions.refetch()}
          empty={positions.data?.length === 0}
          loadingText="Ładowanie pozycji…"
          emptyText="Brak historii pozycji."
        />
        {posPoints.length > 0 && (
          <>
            <div
              className="mt-4 h-72"
              role="img"
              aria-label={`Wykres pozycji kierowców ${drivers.get(a)?.full_name ?? a} i ${drivers.get(b ?? -1)?.full_name ?? b}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={posPoints} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#262626" />
                  <XAxis
                    dataKey="minute"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v: number) => `${Math.round(v)} min`}
                    stroke="#a3a3a3"
                  />
                  <YAxis reversed domain={[1, maxPosition]} allowDecimals={false} stroke="#a3a3a3" />
                  <Tooltip labelFormatter={(v) => `${Math.round(Number(v))} min`} />
                  <Line
                    dataKey="a"
                    name={drivers.get(a)?.name_acronym ?? `#${a}`}
                    stroke="#f87171"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="b"
                    name={drivers.get(b ?? -1)?.name_acronym ?? `#${b}`}
                    stroke="#60a5fa"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              {drivers.get(a)?.name_acronym ?? `#${a}`}:{' '}
              {firstA === undefined ? 'brak danych' : `P${firstA} → P${lastA}`}
              {b !== undefined &&
                ` · ${drivers.get(b)?.name_acronym ?? `#${b}`}: ${firstB === undefined ? 'brak danych' : `P${firstB} → P${lastB}`}`}
            </p>
          </>
        )}
      </div>
      {numbers.length > 0 && (
        <div>
          <h3 className="font-medium">Strata {drivers.get(a)?.name_acronym ?? `#${a}`} do lidera</h3>
          <QueryFeedback
            loading={intervals.isPending}
            error={intervals.error}
            retry={() => intervals.refetch()}
            empty={intervals.data?.length === 0}
            loadingText="Ładowanie odstępów…"
            emptyText="Brak odstępów dla tego kierowcy."
          />
          {intervals.data && intervals.data.length > 0 && gaps.length === 0 && (
            <p className="mt-2 text-sm text-neutral-400">
              Brak liczbowej straty do lidera (lider lub zawodnik zdublowany).
            </p>
          )}
          {gaps.length > 0 && (
            <div className="mt-3 h-48" role="img" aria-label="Wykres straty do lidera w sekundach">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gaps}>
                  <CartesianGrid stroke="#262626" />
                  <XAxis
                    dataKey="minute"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v: number) => `${Math.round(v)} min`}
                    stroke="#a3a3a3"
                  />
                  <YAxis stroke="#a3a3a3" unit=" s" />
                  <Tooltip labelFormatter={(v) => `${Math.round(Number(v))} min`} />
                  <Line dataKey="gap" name="Strata do lidera" stroke="#facc15" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-medium">Komunikaty kontroli wyścigu</h3>
          <QueryFeedback
            loading={control.isPending}
            error={control.error}
            retry={() => control.refetch()}
            empty={control.data?.length === 0}
            loadingText="Ładowanie komunikatów…"
            emptyText="Brak komunikatów."
          />
          <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
            {control.data
              ?.filter((c) => ['Flag', 'SafetyCar', 'CarEvent', 'SessionStatus'].includes(c.category))
              .map((c, i) => (
                <li key={`${c.date}-${i}`} className="rounded bg-neutral-900 p-2">
                  <span className="mr-2 text-neutral-500">{formatTime(c.date)}</span>
                  {c.message}
                </li>
              ))}
          </ol>
        </div>
        <div>
          <h3 className="font-medium">Zmiany pozycji</h3>
          <p className="mt-1 text-xs text-neutral-500">
            OpenF1 zalicza też zmiany po pit stopach i karach; lista może być niepełna.
          </p>
          <QueryFeedback
            loading={overtakes.isPending}
            error={overtakes.error}
            retry={() => overtakes.refetch()}
            empty={overtakes.data?.length === 0}
            loadingText="Ładowanie zmian pozycji…"
            emptyText="Brak danych o zmianach pozycji."
          />
          <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
            {overtakes.data?.map((o, i) => (
              <li key={`${o.date}-${i}`} className="rounded bg-neutral-900 p-2">
                <span className="mr-2 text-neutral-500">{formatTime(o.date)}</span>
                {drivers.get(o.overtaking_driver_number)?.name_acronym ?? `#${o.overtaking_driver_number}`} przed{' '}
                {drivers.get(o.overtaken_driver_number)?.name_acronym ?? `#${o.overtaken_driver_number}`} · P
                {o.position}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
