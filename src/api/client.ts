const BASE_URL = 'https://api.openf1.org/v1'

type Primitive = string | number | boolean
export type Params = Record<string, Primitive | Primitive[] | undefined>

/**
 * Builds an OpenF1 query string. Keys may carry a comparison operator,
 * e.g. { 'lap_duration>=': 120, 'date<': '2026-10-04T08:00' }.
 * Array values repeat the key (driver_number=1&driver_number=4).
 */
function toQuery(params: Params): string {
  const parts: string[] = []
  for (const [rawKey, value] of Object.entries(params)) {
    if (value === undefined) continue
    const match = rawKey.match(/^(.*?)(>=|<=|>|<)?$/)!
    const key = encodeURIComponent(match[1])
    const op = match[2] ?? '='
    for (const v of Array.isArray(value) ? value : [value]) {
      parts.push(`${key}${op}${encodeURIComponent(String(v))}`)
    }
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

// The free tier allows 3 requests/second and 30 requests/minute. Requests go out one at a
// time and sliding windows hold them back once a budget is used up, so we wait instead of
// collecting 429s. Limits carry a little headroom for clock jitter.
const LIMITS = [
  { max: 2, windowMs: 1_000 },
  { max: 28, windowMs: 60_000 },
]
const WINDOW_MS = Math.max(...LIMITS.map((l) => l.windowMs))
const MAX_RETRIES = 3
const SENT_KEY = 'openf1-sent'
let queue: Promise<unknown> = Promise.resolve()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Timestamps live in localStorage so the budget survives reloads and is shared across tabs.
function readSent(): number[] {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeSent(sent: number[]) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent))
  } catch {
    // Storage unavailable (private mode etc.): the limiter still works per page.
  }
}

let memorySent: number[] = []

async function waitForBudget() {
  for (;;) {
    const now = Date.now()
    const stored = readSent()
    const sent = (stored.length >= memorySent.length ? stored : memorySent).filter((t) => now - t < WINDOW_MS)
    // For each exceeded limit, the wait is until its oldest in-window request ages out.
    const waits = LIMITS.map(({ max, windowMs }) => {
      const inWindow = sent.filter((t) => now - t < windowMs)
      return inWindow.length < max ? 0 : inWindow[inWindow.length - max] + windowMs - now
    })
    const wait = Math.max(...waits)
    if (wait <= 0) {
      memorySent = [...sent, now]
      writeSent(memorySent)
      return
    }
    await sleep(wait + 50)
  }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task)
  queue = run.catch(() => {})
  return run
}

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await waitForBudget()
    const res = await fetch(url)
    if (res.status !== 429 || attempt === MAX_RETRIES) return res
    // Someone else (another tab) used the budget: back off for the rest of the window.
    const retryAfter = Number(res.headers.get('retry-after'))
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 20_000)
  }
}

export function get<T>(endpoint: string, params: Params = {}): Promise<T[]> {
  return enqueue(async () => {
    const res = await fetchWithRetry(`${BASE_URL}/${endpoint}${toQuery(params)}`)
    if (!res.ok) throw new Error(`OpenF1 ${endpoint}: HTTP ${res.status}`)
    return res.json()
  })
}
