import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLaps, useWeather } from '../../api/queries'
import type { Driver, SessionResult } from '../../api/types'
import { formatDuration } from '../../format'
import QueryFeedback from '../QueryFeedback'

export default function WeatherLaps({
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
  const weather = useWeather(sessionKey, dateEnd)
  const laps = useLaps(sessionKey, dateEnd)
  const numbers = results.length
    ? results.map((r) => r.driver_number)
    : [...new Set((laps.data ?? []).map((l) => l.driver_number))]
  const [picked, setPicked] = useState<number>()
  const driver = numbers.includes(picked ?? -1) ? picked! : numbers[0]
  const conditions = [...(weather.data ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const timedLaps = (laps.data ?? []).filter(
    (l) => l.driver_number === driver && l.lap_duration && l.date_start && !l.is_pit_out_lap,
  )
  const lapPoints = timedLaps
    .map((lap) => {
      const stamp = Date.parse(lap.date_start!)
      const nearest = conditions.reduce<(typeof conditions)[number] | undefined>(
        (best, row) =>
          !best || Math.abs(Date.parse(row.date) - stamp) < Math.abs(Date.parse(best.date) - stamp) ? row : best,
        undefined,
      )
      return {
        lap: lap.lap_number,
        time: lap.lap_duration!,
        air: nearest?.air_temperature,
        track: nearest?.track_temperature,
        rain: nearest?.rainfall,
      }
    })
    .sort((a, b) => a.lap - b.lap)
  const weatherPoints = conditions.map((w) => ({
    minute: (Date.parse(w.date) - Date.parse(conditions[0].date)) / 60_000,
    air: w.air_temperature,
    track: w.track_temperature,
    rain: w.rainfall,
  }))

  return (
    <section className="mt-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Pogoda i tempo</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Temperatura toru i powietrza oraz czasy okrążeń wybranego kierowcy.
        </p>
      </div>
      <QueryFeedback
        loading={weather.isPending}
        error={weather.error}
        retry={() => weather.refetch()}
        empty={weather.data?.length === 0}
        loadingText="Ładowanie pogody…"
        emptyText="Brak danych pogodowych."
      />
      {weatherPoints.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Temperatura w trakcie sesji</h3>
          <div className="h-56" role="img" aria-label="Wykres temperatury powietrza i toru">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weatherPoints}>
                <CartesianGrid stroke="#262626" />
                <XAxis dataKey="minute" tickFormatter={(v: number) => `${Math.round(v)} min`} stroke="#a3a3a3" />
                <YAxis unit="°C" stroke="#a3a3a3" />
                <Tooltip labelFormatter={(v) => `${Math.round(Number(v))} min`} />
                <Line dataKey="air" name="Powietrze" stroke="#60a5fa" dot={false} isAnimationActive={false} />
                <Line dataKey="track" name="Tor" stroke="#f87171" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Opady: {conditions.some((w) => w.rainfall > 0) ? 'odnotowane w trakcie sesji' : 'nieodnotowane'}
          </p>
        </div>
      )}
      <div>
        {numbers.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            Kierowca
            <select
              value={driver ?? ''}
              onChange={(e) => setPicked(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
            >
              {numbers.map((n) => (
                <option key={n} value={n}>
                  {drivers.get(n)?.full_name ?? `#${n}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <QueryFeedback
          loading={laps.isPending}
          error={laps.error}
          retry={() => laps.refetch()}
          empty={laps.data?.length === 0}
          loadingText="Ładowanie okrążeń…"
          emptyText="Brak czasów okrążeń."
        />
        {lapPoints.length > 0 && (
          <>
            <div
              className="mt-4 h-56"
              role="img"
              aria-label={`Wykres czasów okrążeń ${drivers.get(driver)?.full_name ?? driver}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lapPoints}>
                  <CartesianGrid stroke="#262626" />
                  <XAxis dataKey="lap" stroke="#a3a3a3" />
                  <YAxis
                    tickFormatter={(v: number) => formatDuration(v)}
                    domain={['dataMin', 'dataMax']}
                    stroke="#a3a3a3"
                  />
                  <Tooltip formatter={(v) => `${formatDuration(Number(v))}`} labelFormatter={(v) => `Okrążenie ${v}`} />
                  <Line dataKey="time" name="Czas okrążenia" stroke="#a78bfa" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 max-h-56 overflow-y-auto rounded border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-900 text-left text-neutral-400">
                  <tr>
                    <th className="p-2">Okr.</th>
                    <th>Czas</th>
                    <th>Tor</th>
                    <th>Opady</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {lapPoints.map((p) => (
                    <tr key={p.lap}>
                      <td className="p-2">{p.lap}</td>
                      <td>{formatDuration(p.time)}</td>
                      <td>{p.track === undefined ? '—' : `${p.track.toFixed(1)}°C`}</td>
                      <td>{p.rain === undefined ? '—' : p.rain ? 'Tak' : 'Nie'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Warunki dopasowane do początku okrążenia z najbliższego pomiaru (OpenF1 aktualizuje pogodę co około
              minutę). Zbieżność zmian nie oznacza, że pogoda była ich jedyną przyczyną.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
