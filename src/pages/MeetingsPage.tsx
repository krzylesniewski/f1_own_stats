import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMeetings } from '../api/queries'
import QueryFeedback from '../components/QueryFeedback'
import type { Meeting } from '../api/types'
import { CURRENT_YEAR, formatDate } from '../format'

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
  const year = Number(useParams().year ?? CURRENT_YEAR)
  const { data: meetings, isPending, error, refetch } = useMeetings(year)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const nextKey = [...(meetings ?? [])]
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .find((m) => meetingStatus(m, now) === 'upcoming')?.meeting_key

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Sezon {year}</h1>
        <p className="mt-1 text-sm text-neutral-400">Weekendy Formuły 1 · dane z OpenF1</p>
      </header>

      <QueryFeedback
        loading={isPending}
        error={error}
        retry={() => refetch()}
        empty={meetings?.length === 0}
        loadingText="Ładowanie weekendów…"
        emptyText="Brak weekendów w tym sezonie."
      />

      <ul className="mt-6 divide-y divide-neutral-800">
        {meetings?.map((m) => {
          const status = meetingStatus(m, now)
          const badge = STATUS_BADGE[status]
          return (
            <li key={m.meeting_key}>
              <Link
                to={`/${year}/${m.meeting_key}`}
                className="-mx-3 flex flex-col gap-2 rounded-md px-3 py-3 hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-sky-400 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`w-24 shrink-0 rounded-full border px-2 py-0.5 text-center text-xs sm:w-28 ${badge.className}`}
                  >
                    {m.meeting_key === nextKey ? 'Następny' : badge.label}
                  </span>
                  <span
                    className={`${status === 'cancelled' ? 'text-neutral-500 line-through' : status === 'done' ? 'text-neutral-300' : ''}`}
                  >
                    {m.meeting_name}
                  </span>
                </span>
                <span className="pl-[6.75rem] text-sm text-neutral-400 sm:shrink-0 sm:pl-0">
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
