import { Link, useParams } from 'react-router-dom'
import { useMeeting, useSessions } from '../api/queries'
import { formatDate, formatDateTime } from '../format'

export default function MeetingPage() {
  const { year, meetingKey } = useParams()
  const key = Number(meetingKey)
  const { data: meeting, isLoading: meetingLoading, error: meetingError } = useMeeting(key)
  const { data: sessions, isLoading: sessionsLoading, error: sessionsError } = useSessions(key)
  const error = meetingError ?? sessionsError

  return (
    <>
      <Link to={`/${year}`} className="text-sm text-neutral-400 hover:text-neutral-100">
        ‹ Sezon {year}
      </Link>

      {meetingLoading && <p className="mt-6 text-neutral-400">Ładowanie…</p>}
      {error && <p className="mt-6 text-red-400">{error.message}</p>}
      {meeting === null && <p className="mt-6 text-neutral-400">Nie znaleziono weekendu.</p>}

      {meeting && (
        <header className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{meeting.meeting_name}</h1>
            <p className="mt-1 text-sm text-neutral-400">{meeting.meeting_official_name}</p>
            <p className="mt-2 text-sm text-neutral-300">
              {meeting.circuit_short_name} · {meeting.location}, {meeting.country_name} ·{' '}
              {formatDate(meeting.date_start)} – {formatDate(meeting.date_end)}
            </p>
          </div>
          {meeting.circuit_image && (
            <img
              src={meeting.circuit_image}
              alt={`Tor ${meeting.circuit_short_name}`}
              className="hidden h-24 sm:block"
            />
          )}
        </header>
      )}

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-400">Sesje</h2>
      {sessionsLoading && <p className="mt-3 text-neutral-400">Ładowanie…</p>}
      {sessions?.length === 0 && <p className="mt-3 text-neutral-400">Brak sesji.</p>}

      <ul className="mt-2 divide-y divide-neutral-800">
        {sessions?.map((s) => (
          <li key={s.session_key}>
            <Link
              to={`/${year}/${meetingKey}/${s.session_key}`}
              className="-mx-3 flex items-center justify-between gap-4 rounded-md px-3 py-3 hover:bg-neutral-900"
            >
              <span className={s.is_cancelled ? 'text-neutral-500 line-through' : ''}>
                {s.session_name}
                {s.session_name !== s.session_type && (
                  <span className="ml-2 text-xs text-neutral-500">{s.session_type}</span>
                )}
              </span>
              <span className="shrink-0 text-sm text-neutral-400">
                {formatDateTime(s.date_start)} <span aria-hidden>›</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
