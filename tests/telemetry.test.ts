import assert from 'node:assert/strict'
import test from 'node:test'
import { bestLap, compareLaps } from '../src/telemetry.ts'
import type { CarData, Lap, Location } from '../src/api/types.ts'

const start = Date.parse('2024-01-01T12:00:00Z')
const timestamp = (seconds: number) => new Date(start + seconds * 1000).toISOString()

function lap(driver_number: number, lap_duration: number): Lap {
  return {
    driver_number,
    session_key: 1,
    meeting_key: 1,
    lap_number: 2,
    date_start: timestamp(0),
    lap_duration,
    duration_sector_1: lap_duration * 0.3,
    duration_sector_2: lap_duration * 0.3,
    duration_sector_3: lap_duration * 0.4,
    i1_speed: null,
    i2_speed: null,
    st_speed: null,
    is_pit_out_lap: false,
  }
}

function telemetry(driver: number, duration: number) {
  const carData: CarData[] = Array.from({ length: 11 }, (_, i) => ({
    driver_number: driver,
    date: timestamp((duration * i) / 10),
    speed: 180,
    throttle: 100,
    brake: 0,
    n_gear: 8,
    rpm: 11000,
    drs: 0,
  }))
  const location: Location[] = Array.from({ length: 11 }, (_, i) => ({
    driver_number: driver,
    date: timestamp((duration * i) / 10),
    x: i * 100,
    y: i * 10,
    z: 0,
  }))
  return { carData, location }
}

test('bestLap excludes pit-out laps and laps without a usable timestamp', () => {
  const pit = { ...lap(1, 80), is_pit_out_lap: true }
  const missingStart = { ...lap(1, 70), date_start: null }
  const valid = lap(1, 90)
  assert.equal(bestLap([pit, missingStart, valid, lap(2, 85)], 1), valid)
})

test('comparison preserves official finish gap and gives finite traces', () => {
  const result = compareLaps(lap(1, 100), telemetry(1, 100), lap(2, 102), telemetry(2, 102))
  assert.ok(result)
  assert.ok(result.trace.length > 100)
  assert.equal(result.trace[0].delta, 0)
  assert.ok(Math.abs(result.trace.at(-1)!.delta - 2) < 0.01)
  assert.ok(result.trace.every((point) => Number.isFinite(point.distance) && Number.isFinite(point.delta)))
  assert.ok(result.segments.length > 0)
})

test('comparison handles missing telemetry without crashing', () => {
  assert.equal(compareLaps(lap(1, 100), { carData: [], location: [] }, lap(2, 102), telemetry(2, 102)), null)
})
