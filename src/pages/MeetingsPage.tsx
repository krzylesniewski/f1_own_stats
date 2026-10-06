import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMeetings } from '../api/queries'
import type { Meeting } from '../api/types'
import { CURRENT_YEAR, FIRST_YEAR, formatDate } from '../format'

const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)

type Status = 'done' | 'live' | 'upcoming' | 'cancelled'

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  done: { label: 'Zakończony', className: 'border-neutral-700 text-neutral-400' },
  live: { label: 'Trwa', className: 'border-red-500/60 bg-red-500/10 text-red-400' },
  upcoming: { label: 'Nadchodzący', className: 'border-sky-500/50 bg-sky-500/10 text-sky-300' },
  cancelled: { label: 'Odwołany', className: 'border-neutral-800 text-neutral-500' },
}

function meetingStatus(m: Meeting, now: number): Status {
  if (m.is_cancelled) return 'cancelled'
  if (now < Date.parse(m.date_start)) return 'upcoming'
  if (now > Date.parse(m.date_end)) return 'done'
  return 'live'
}

export default function MeetingsPage() {
  const year = Number(useParams().year)
  const navigate = useNavigate()
  const { data: meetings, isLoading, error } = useMeetings(year)
  const [now] = useState(() => Date.now())
  const nextKey = meetings?.find((m) => meetingStatus(m, now) === 'upcoming')?.meeting_key

  return (
    <>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">F1 Stats</h1>
          <p className="mt-1 text-sm text-neutral-400">Dane z OpenF1</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          Sezon
          <select
            value={year}
            onChange={(e) => navigate(`/${e.target.value}`)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </header>

      {isLoading && <p className="mt-6 text-neutral-400">Ładowanie…</p>}
      {error && <p className="mt-6 text-red-400">{error.message}</p>}
      {meetings?.length === 0 && <p className="mt-6 text-neutral-400">Brak weekendów w tym sezonie.</p>}

      <ul className="mt-6 divide-y divide-neutral-800">
        {meetings?.map((m) => {
          const status = meetingStatus(m, now)
          const badge = STATUS_BADGE[status]
          return (
            <li key={m.meeting_key}>
              <Link
                to={`/${year}/${m.meeting_key}`}
                className="-mx-3 flex items-center justify-between gap-4 rounded-md px-3 py-3 hover:bg-neutral-900"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`w-28 shrink-0 rounded-full border px-2 py-0.5 text-center text-xs ${badge.className}`}
                  >
                    {m.meeting_key === nextKey ? 'Następny' : badge.label}
                  </span>
                  <span
                    className={`truncate ${status === 'cancelled' ? 'text-neutral-500 line-through' : status === 'done' ? 'text-neutral-300' : ''}`}
                  >
                    {m.meeting_name}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-neutral-400">
                  {m.location} · {formatDate(m.date_start)} <span aria-hidden>›</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
