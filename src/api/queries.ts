import { useQuery } from '@tanstack/react-query'
import { get } from './client'
import type { CarData, Driver, Lap, Location, Meeting, Session, SessionResult, TeamRadio } from './types'

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

/** Results-type data: empty means "not published yet", so retry later; otherwise it's final. */
const staleUntilPublished = (query: { state: { data: unknown } }) => {
  const data = query.state.data as unknown[] | null | undefined
  return data && (!Array.isArray(data) || data.length) ? Infinity : 10 * MINUTE
}

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

export const useDrivers = (sessionKey: number | undefined) =>
  useQuery({
    queryKey: ['drivers', sessionKey],
    queryFn: () => get<Driver>('drivers', { session_key: sessionKey }),
    staleTime: staleUntilPublished,
    enabled: sessionKey !== undefined,
  })

export const useSessionResult = (sessionKey: number | undefined) =>
  useQuery({
    queryKey: ['session_result', sessionKey],
    queryFn: () => get<SessionResult>('session_result', { session_key: sessionKey }),
    staleTime: staleUntilPublished,
    enabled: sessionKey !== undefined,
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

export const useTeamRadio = (sessionKey: number | undefined, driverNumbers: number[]) =>
  useQuery({
    queryKey: ['team_radio', sessionKey, driverNumbers],
    queryFn: () => get<TeamRadio>('team_radio', { session_key: sessionKey, driver_number: driverNumbers }),
    staleTime: staleUntilPublished,
    enabled: sessionKey !== undefined && driverNumbers.length > 0,
  })

export const useLaps = (sessionKey: number | undefined) =>
  useQuery({
    queryKey: ['laps', sessionKey],
    queryFn: () => get<Lap>('laps', { session_key: sessionKey }),
    staleTime: staleUntilPublished,
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

// lap date_start is approximate, so pad the window and let the caller trim.
function lapWindow(dateStart: string, duration: number) {
  const start = Date.parse(dateStart)
  return {
    'date>=': new Date(start - 1000).toISOString(),
    'date<=': new Date(start + (duration + 1) * 1000).toISOString(),
  }
}
