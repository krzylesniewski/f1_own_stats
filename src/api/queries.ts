import { useQuery } from '@tanstack/react-query'
import { get } from './client'
import type {
  CarData,
  ChampionshipDriver,
  ChampionshipTeam,
  Driver,
  Interval,
  Lap,
  Location,
  Meeting,
  Overtake,
  PitStop,
  Position,
  RaceControl,
  Session,
  SessionResult,
  Stint,
  TeamRadio,
  Weather,
} from './types'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Calendar data for events that ended more than two days ago is final (stale: never).
 * Upcoming or just-finished events can still change (OpenF1 refreshes calendars daily),
 * so those refresh hourly.
 */
const staleUnlessFinished = (query: { state: { data: unknown } }) => {
  const data = query.state.data as { date_end: string }[] | { date_end: string } | null | undefined
  const rows = data ? (Array.isArray(data) ? data : [data]) : []
  if (!rows.length) return 10 * MINUTE
  const latestEnd = Math.max(...rows.map((r) => Date.parse(r.date_end)))
  return Date.now() - latestEnd < 2 * DAY ? HOUR : Infinity
}

/** Session data remains refreshable until the session has finished and corrections have settled. */
export const sessionStaleTime = (dateEnd?: string) =>
  dateEnd && Date.now() - Date.parse(dateEnd) > 2 * DAY ? Infinity : 10 * MINUTE

const rowsStaleTime = (query: { state: { data: unknown } }, dateEnd?: string) =>
  Array.isArray(query.state.data) && query.state.data.length > 0 ? sessionStaleTime(dateEnd) : 10 * MINUTE

export const useMeetings = (year: number) =>
  useQuery({
    queryKey: ['meetings', year],
    queryFn: () => get<Meeting>('meetings', { year }),
    staleTime: staleUnlessFinished,
  })

export const useSessions = (meetingKey: number | undefined) =>
  useQuery({
    queryKey: ['sessions', meetingKey],
    queryFn: () => get<Session>('sessions', { meeting_key: meetingKey }),
    staleTime: staleUnlessFinished,
    enabled: meetingKey !== undefined,
  })

export const useRaceSessions = (year: number) =>
  useQuery({
    queryKey: ['race_sessions', year],
    queryFn: () => get<Session>('sessions', { year, session_type: 'Race' }),
    staleTime: staleUnlessFinished,
  })

export const useDrivers = (sessionKey: number | undefined, dateEnd?: string) =>
  useQuery({
    queryKey: ['drivers', sessionKey],
    queryFn: () => get<Driver>('drivers', { session_key: sessionKey }),
    staleTime: (query) => rowsStaleTime(query, dateEnd),
    enabled: sessionKey !== undefined,
  })

export const useSessionResult = (sessionKey: number | undefined, dateEnd?: string, ready = true) =>
  useQuery({
    queryKey: ['session_result', sessionKey],
    queryFn: () => get<SessionResult>('session_result', { session_key: sessionKey }),
    staleTime: (query) => rowsStaleTime(query, dateEnd),
    enabled: sessionKey !== undefined && !!dateEnd && ready,
  })

export const useMeeting = (meetingKey: number | undefined) =>
  useQuery({
    queryKey: ['meeting', meetingKey],
    queryFn: () => get<Meeting>('meetings', { meeting_key: meetingKey }).then((rows) => rows[0] ?? null),
    staleTime: staleUnlessFinished,
    enabled: meetingKey !== undefined,
  })

export const useSession = (sessionKey: number | undefined) =>
  useQuery({
    queryKey: ['session', sessionKey],
    queryFn: () => get<Session>('sessions', { session_key: sessionKey }).then((rows) => rows[0] ?? null),
    staleTime: staleUnlessFinished,
    enabled: sessionKey !== undefined,
  })

export const useTeamRadio = (sessionKey: number | undefined, driverNumbers: number[], dateEnd?: string) =>
  useQuery({
    queryKey: ['team_radio', sessionKey, driverNumbers],
    queryFn: () => get<TeamRadio>('team_radio', { session_key: sessionKey, driver_number: driverNumbers }),
    staleTime: (query) => rowsStaleTime(query, dateEnd),
    enabled: sessionKey !== undefined && driverNumbers.length > 0,
  })

export const useLaps = (sessionKey: number | undefined, dateEnd?: string) =>
  useQuery({
    queryKey: ['laps', sessionKey],
    queryFn: () => get<Lap>('laps', { session_key: sessionKey }),
    staleTime: (query) => rowsStaleTime(query, dateEnd),
    enabled: sessionKey !== undefined,
  })

/** Telemetry for a single lap. Always filtered by driver and time window: a full session is ~9 MB per driver. */
export const useLapTelemetry = (lap: Lap | undefined) => {
  const window = lap?.date_start && lap.lap_duration ? lapWindow(lap.date_start, lap.lap_duration) : undefined
  const params = lap && window && { session_key: lap.session_key, driver_number: lap.driver_number, ...window }
  return useQuery({
    queryKey: ['lap_telemetry', lap?.session_key, lap?.driver_number, lap?.lap_number],
    queryFn: async () => {
      const carData = await get<CarData>('car_data', params!)
      const location = await get<Location>('location', params!)
      return { carData, location }
    },
    enabled: params !== undefined,
  })
}

const useSessionRows = <T>(
  endpoint: string,
  key: string,
  sessionKey: number | undefined,
  dateEnd?: string,
  extra?: Record<string, number>,
) =>
  useQuery({
    queryKey: [key, sessionKey, extra],
    queryFn: () => get<T>(endpoint, { session_key: sessionKey, ...extra }),
    staleTime: (query) => rowsStaleTime(query, dateEnd),
    enabled: sessionKey !== undefined,
  })

export const useStints = (key: number | undefined, end?: string) => useSessionRows<Stint>('stints', 'stints', key, end)
export const usePitStops = (key: number | undefined, end?: string) => useSessionRows<PitStop>('pit', 'pit', key, end)
export const usePositions = (key: number | undefined, end?: string) =>
  useSessionRows<Position>('position', 'position', key, end)
export const useIntervals = (key: number | undefined, driverNumber: number | undefined, end?: string) =>
  useSessionRows<Interval>(
    'intervals',
    'intervals',
    key && driverNumber ? key : undefined,
    end,
    driverNumber ? { driver_number: driverNumber } : undefined,
  )
export const useRaceControl = (key: number | undefined, end?: string) =>
  useSessionRows<RaceControl>('race_control', 'race_control', key, end)
export const useWeather = (key: number | undefined, end?: string) =>
  useSessionRows<Weather>('weather', 'weather', key, end)
export const useOvertakes = (key: number | undefined, end?: string) =>
  useSessionRows<Overtake>('overtakes', 'overtakes', key, end)
export const useChampionshipDrivers = (key: number | undefined, end?: string) =>
  useSessionRows<ChampionshipDriver>('championship_drivers', 'championship_drivers', key, end)
export const useChampionshipTeams = (key: number | undefined, end?: string) =>
  useSessionRows<ChampionshipTeam>('championship_teams', 'championship_teams', key, end)

// lap date_start is approximate, so pad the window and let the caller trim.
function lapWindow(dateStart: string, duration: number) {
  const start = Date.parse(dateStart)
  return {
    'date>=': new Date(start - 1000).toISOString(),
    'date<=': new Date(start + (duration + 1) * 1000).toISOString(),
  }
}
