import type { ReactElement, ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TracePoint } from '../../telemetry'
import { DASH_B } from './colors'

interface Props {
  trace: TracePoint[]
  colors: { A: string; B: string }
  names: { A: string; B: string }
}

const SYNC_ID = 'lap-compare'
const AXIS = { stroke: '#525252', tick: { fill: '#a3a3a3', fontSize: 11 }, tickLine: false }
const GRID = <CartesianGrid stroke="#262626" vertical={false} />

const formatKm = (m: number) => `${(m / 1000).toFixed(1)} km`

interface TooltipProps {
  active?: boolean
  payload?: readonly { payload?: unknown }[]
  label?: string | number
  render: (p: TracePoint) => ReactNode
}

function ChartTooltip({ active, payload, label, render }: TooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as TracePoint
  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 text-neutral-400">{formatKm(Number(label))}</div>
      {render(point)}
    </div>
  )
}

function Row({ color, dashed, name, value }: { color: string; dashed?: boolean; name: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-neutral-200">
      <svg width="16" height="4" aria-hidden>
        <line
          x1="0"
          y1="2"
          x2="16"
          y2="2"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '4 2' : undefined}
        />
      </svg>
      <span className="text-neutral-400">{name}</span>
      <span className="ml-auto pl-3 tabular-nums">{value}</span>
    </div>
  )
}

function Panel({ title, height, children }: { title: string; height: number; children: ReactElement }) {
  return (
    <div>
      <h4 className="mb-1 text-xs text-neutral-400">{title}</h4>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function LapCharts({ trace, colors, names }: Props) {
  const pair = (
    key: 'speed' | 'throttle' | 'gear' | 'brake',
    unit: string,
    type: 'monotone' | 'stepAfter' = 'monotone',
  ) => (
    <>
      <Line
        dataKey={`${key}A`}
        name={names.A}
        stroke={colors.A}
        strokeWidth={2}
        dot={false}
        type={type}
        isAnimationActive={false}
      />
      <Line
        dataKey={`${key}B`}
        name={names.B}
        stroke={colors.B}
        strokeWidth={2}
        strokeDasharray={DASH_B}
        dot={false}
        type={type}
        isAnimationActive={false}
      />
      <Tooltip
        cursor={{ stroke: '#737373' }}
        content={(props) => (
          <ChartTooltip
            active={props.active}
            payload={props.payload}
            label={props.label}
            render={(p) => (
              <>
                <Row color={colors.A} name={names.A} value={`${p[`${key}A`]}${unit}`} />
                <Row color={colors.B} dashed name={names.B} value={`${p[`${key}B`]}${unit}`} />
              </>
            )}
          />
        )}
      />
    </>
  )

  const xAxis = (show: boolean) => (
    <XAxis
      dataKey="distance"
      type="number"
      domain={['dataMin', 'dataMax']}
      tickFormatter={formatKm}
      hide={!show}
      {...AXIS}
    />
  )

  return (
    <div className="space-y-4">
      <Panel title="Prędkość (km/h)" height={220}>
        <LineChart data={trace} syncId={SYNC_ID} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {GRID}
          {xAxis(false)}
          <YAxis
            domain={[(min: number) => Math.floor(min / 50) * 50, (max: number) => Math.ceil(max / 50) * 50]}
            tickCount={5}
            allowDecimals={false}
            {...AXIS}
          />
          {pair('speed', ' km/h')}
        </LineChart>
      </Panel>

      <Panel title={`Różnica czasu: ${names.B} względem ${names.A} (s) · powyżej zera ${names.B} traci`} height={140}>
        <LineChart data={trace} syncId={SYNC_ID} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {GRID}
          {xAxis(false)}
          <YAxis {...AXIS} tickFormatter={(v: number) => v.toFixed(2)} />
          <ReferenceLine y={0} stroke={colors.A} strokeWidth={1} />
          <Line
            dataKey="delta"
            stroke={colors.B}
            strokeWidth={2}
            strokeDasharray={DASH_B}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            cursor={{ stroke: '#737373' }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload}
                label={props.label}
                render={(p) => (
                  <Row
                    color={colors.B}
                    dashed
                    name={names.B}
                    value={`${p.delta > 0 ? '+' : ''}${p.delta.toFixed(3)} s`}
                  />
                )}
              />
            )}
          />
        </LineChart>
      </Panel>

      <Panel title="Gaz (%)" height={110}>
        <LineChart data={trace} syncId={SYNC_ID} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {GRID}
          {xAxis(false)}
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...AXIS} />
          {pair('throttle', '%')}
        </LineChart>
      </Panel>

      <Panel title="Hamulec" height={70}>
        <LineChart data={trace} syncId={SYNC_ID} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {GRID}
          {xAxis(false)}
          <YAxis domain={[0, 100]} ticks={[0, 100]} tickFormatter={(v: number) => (v ? 'on' : 'off')} {...AXIS} />
          {pair('brake', '')}
        </LineChart>
      </Panel>

      <Panel title="Bieg" height={130}>
        <LineChart data={trace} syncId={SYNC_ID} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          {GRID}
          {xAxis(true)}
          <YAxis domain={[1, 8]} ticks={[2, 4, 6, 8]} {...AXIS} />
          {pair('gear', '', 'stepAfter')}
        </LineChart>
      </Panel>
    </div>
  )
}
