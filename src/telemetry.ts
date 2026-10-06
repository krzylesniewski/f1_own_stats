import type { CarData, Lap, Location } from './api/types'

/** Spacing of the common distance grid both laps are resampled onto. */
const GRID_STEP_M = 10

interface Sample {
  t: number // seconds since lap start
  d: number // metres since lap start
  speed: number
  throttle: number
  brake: number
  gear: number
}

export interface TracePoint {
  distance: number
  speedA: number
  speedB: number
  throttleA: number
  throttleB: number
  brakeA: number
  brakeB: number
  gearA: number
  gearB: number
  /** Seconds B is behind A at this distance (negative: B is ahead). */
  delta: number
}

export interface TrackSegment {
  points: [number, number][]
  /** Which driver was quicker through this segment. */
  faster: 'A' | 'B'
}

export interface LapComparison {
  trace: TracePoint[]
  segments: TrackSegment[]
  lapLength: number
}

export const bestLap = (laps: Lap[], driverNumber: number) =>
  laps
    .filter((l) => l.driver_number === driverNumber && l.lap_duration && l.date_start && !l.is_pit_out_lap)
    .reduce<Lap | undefined>((best, l) => (!best || l.lap_duration! < best.lap_duration! ? l : best), undefined)

interface LapFrame {
  samples: Sample[]
  /** Seconds since lap start for a timestamp, on the same (rescaled) clock as `samples`. */
  timeOf: (iso: string) => number
}

interface Located {
  t: number
  d: number
  x: number
  y: number
}

/** OpenF1 has no distance channel, so integrate speed over time (trapezoid rule), as FastF1 does. */
function toFrame(lap: Lap, carData: CarData[]): LapFrame {
  const start = Date.parse(lap.date_start!)
  const duration = lap.lap_duration!
  const raw = (iso: string) => (Date.parse(iso) - start) / 1000
  const samples: Sample[] = []
  for (const c of carData) {
    const t = raw(c.date)
    if (t < 0 || t > duration) continue
    const prev = samples.at(-1)
    const d = prev ? prev.d + (((prev.speed + c.speed) / 2) * (t - prev.t)) / 3.6 : 0
    samples.push({ t, d, speed: c.speed, throttle: c.throttle, brake: c.brake, gear: c.n_gear })
  }
  // date_start is approximate and samples don't land on the lap boundaries, so stretch the
  // sampled span onto [0, lap_duration]. Otherwise the delta trace starts and ends offset.
  const t0 = samples[0]?.t ?? 0
  const span = (samples.at(-1)?.t ?? 0) - t0 || 1
  const rescale = (t: number) => ((t - t0) / span) * duration
  return {
    samples: samples.map((s) => ({ ...s, t: rescale(s.t) })),
    timeOf: (iso) => rescale(raw(iso)),
  }
}

/** Linear interpolation of `key` at position `x` along `by` (samples must be ascending in `by`). */
function interp(samples: Sample[], by: 't' | 'd', x: number, key: keyof Sample, step = false): number {
  const i = samples.findIndex((s) => s[by] >= x)
  if (i === -1) return samples.at(-1)![key]
  if (i === 0) return samples[0][key]
  const a = samples[i - 1]
  const b = samples[i]
  if (step) return a[key]
  const f = (x - a[by]) / (b[by] - a[by] || 1)
  return a[key] + (b[key] - a[key]) * f
}

const at = (samples: Sample[], d: number, key: keyof Sample, step = false) => interp(samples, 'd', d, key, step)

/** Location samples tagged with lap time and distance in this lap's own frame. */
function locate(frame: LapFrame, location: Location[], duration: number): Located[] {
  return location
    .map((p) => ({ t: frame.timeOf(p.date), x: p.x, y: p.y }))
    .filter((p) => p.t >= 0 && p.t <= duration)
    .map((p) => ({ ...p, d: interp(frame.samples, 't', p.t, 'd') }))
}

/** Lap time at each timing line: start, end of S1, end of S2, finish. */
function timingLines(lap: Lap): number[] {
  const { duration_sector_1: s1, duration_sector_2: s2, lap_duration: total } = lap
  return s1 && s2 ? [0, s1, s1 + s2, total!] : [0, total!]
}

/**
 * Integrated distance drifts, so pin both laps to the official timing lines: at the end of
 * each sector both cars are provably at the same spot. Distances between lines are stretched
 * linearly onto the average of the two laps, so the delta matches the official splits there.
 */
function anchorToTimingLines(a: Sample[], lapA: Lap, b: Sample[], lapB: Lap): [Sample[], Sample[]] {
  let linesA = timingLines(lapA)
  let linesB = timingLines(lapB)
  if (linesA.length !== linesB.length) {
    linesA = [0, lapA.lap_duration!]
    linesB = [0, lapB.lap_duration!]
  }
  const distA = linesA.map((t) => interp(a, 't', t, 'd'))
  const distB = linesB.map((t) => interp(b, 't', t, 'd'))
  const target = distA.map((d, i) => (d + distB[i]) / 2)

  const remap = (samples: Sample[], from: number[]) =>
    samples.map((s) => {
      const k = Math.max(0, Math.min(from.length - 2, from.findIndex((d) => d > s.d) - 1))
      const f = (s.d - from[k]) / (from[k + 1] - from[k] || 1)
      return { ...s, d: target[k] + f * (target[k + 1] - target[k]) }
    })
  return [remap(a, distA), remap(b, distB)]
}

/** Rolling median: removes narrow spikes (sampling artefacts in slow corners) but keeps steps and trends. */
function median(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - radius), i + radius + 1).sort((x, y) => x - y)
    return window[Math.floor(window.length / 2)]
  })
}

export function compareLaps(
  lapA: Lap,
  telA: { carData: CarData[]; location: Location[] },
  lapB: Lap,
  telB: { carData: CarData[]; location: Location[] },
  segmentCount = 25,
): LapComparison | null {
  const frameA = toFrame(lapA, telA.carData)
  const frameB = toFrame(lapB, telB.carData)
  if (frameA.samples.length < 10 || frameB.samples.length < 10) return null

  const [a, b] = anchorToTimingLines(frameA.samples, lapA, frameB.samples, lapB)
  const lapLength = a.at(-1)!.d
  const locatedA = locate({ ...frameA, samples: a }, telA.location, lapA.lap_duration!)

  const trace: TracePoint[] = []
  const grid = Array.from({ length: Math.ceil(lapLength / GRID_STEP_M) }, (_, i) => i * GRID_STEP_M)
  for (const d of [...grid, lapLength]) {
    trace.push({
      distance: Math.round(d),
      speedA: Math.round(at(a, d, 'speed')),
      speedB: Math.round(at(b, d, 'speed')),
      throttleA: Math.round(at(a, d, 'throttle')),
      throttleB: Math.round(at(b, d, 'throttle')),
      brakeA: at(a, d, 'brake', true),
      brakeB: at(b, d, 'brake', true),
      gearA: at(a, d, 'gear', true),
      gearB: at(b, d, 'gear', true),
      delta: at(b, d, 't') - at(a, d, 't'),
    })
  }
  const raw = trace.map((p) => p.delta)
  const smoothed = median(raw, 4)
  // Keep the true endpoints: 0 at the start line, the official gap at the finish.
  smoothed[0] = raw[0]
  smoothed[raw.length - 1] = raw.at(-1)!
  trace.forEach((p, i) => (p.delta = Number(smoothed[i].toFixed(3))))

  return { trace, segments: trackSegments(locatedA, a, b, lapLength, segmentCount), lapLength }
}

/** Splits driver A's racing line into equal-distance segments, each tagged with whoever was quicker through it. */
function trackSegments(located: Located[], a: Sample[], b: Sample[], lapLength: number, count: number): TrackSegment[] {
  const size = lapLength / count
  const buckets: [number, number][][] = Array.from({ length: count }, () => [])
  for (const p of located) buckets[Math.min(count - 1, Math.floor(p.d / size))].push([p.x, p.y])

  const segments: TrackSegment[] = []
  buckets.forEach((points, k) => {
    // Append the next segment's first point so the line has no gaps between segments.
    const next = buckets.slice(k + 1).find((bucket) => bucket.length)?.[0]
    const line = next ? [...points, next] : points
    if (line.length < 2) return
    const from = k * size
    const to = (k + 1) * size
    const timeA = at(a, to, 't') - at(a, from, 't')
    const timeB = at(b, to, 't') - at(b, from, 't')
    segments.push({ points: line, faster: timeA <= timeB ? 'A' : 'B' })
  })
  return segments
}
