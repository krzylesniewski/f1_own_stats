import type { TrackSegment } from '../../telemetry'
import { DASH_B } from './colors'

interface Props {
  segments: TrackSegment[]
  colors: { A: string; B: string }
  names: { A: string; B: string }
}

const PAD = 0.06

export default function TrackMap({ segments, colors, names }: Props) {
  const all = segments.flatMap((s) => s.points)
  if (all.length < 2) return <p className="text-sm text-neutral-500">Brak danych o pozycji.</p>

  const xs = all.map(([x]) => x)
  const ys = all.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX
  const h = maxY - minY
  const pad = Math.max(w, h) * PAD
  // SVG y grows downwards, track y grows upwards.
  const toSvg = ([x, y]: [number, number]) => `${x - minX + pad},${maxY - y + pad}`
  const won = { A: segments.filter((s) => s.faster === 'A').length, B: segments.filter((s) => s.faster === 'B').length }
  const [sx, sy] = toSvg(segments[0].points[0]).split(',').map(Number)

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}
        className="mx-auto max-h-96 w-full"
        role="img"
        aria-label={`Mapa toru: ${names.A} szybszy na ${won.A}, ${names.B} na ${won.B} z ${segments.length} odcinków`}
      >
        {/* Wide dark underlay gives the colored segments a surface ring where the track crosses itself. */}
        <polyline
          points={all.map(toSvg).join(' ')}
          fill="none"
          stroke="#0a0a0a"
          strokeWidth={11}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {segments.map((s, i) => (
          <polyline
            key={i}
            points={s.points.map(toSvg).join(' ')}
            fill="none"
            stroke={colors[s.faster]}
            strokeWidth={6}
            strokeDasharray={s.faster === 'B' ? DASH_B : undefined}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            <title>
              Odcinek {i + 1}: szybszy {names[s.faster]}
            </title>
          </polyline>
        ))}
        <circle
          cx={sx}
          cy={sy}
          r={Math.max(w, h) * 0.012}
          fill="#fafafa"
          stroke="#0a0a0a"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        >
          <title>Start / meta</title>
        </circle>
      </svg>
      <figcaption className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-neutral-300">
        {(['A', 'B'] as const).map((k) => (
          <span key={k} className="flex items-center gap-2">
            <svg width="20" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke={colors[k]}
                strokeWidth="4"
                strokeDasharray={k === 'B' ? '5 3' : undefined}
              />
            </svg>
            {names[k]} szybszy · {won[k]}/{segments.length} odcinków
          </span>
        ))}
        <span className="flex items-center gap-2 text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-neutral-50" aria-hidden /> start / meta
        </span>
      </figcaption>
    </figure>
  )
}
