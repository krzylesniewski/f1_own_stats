export interface Meeting {
  meeting_key: number
  meeting_name: string
  meeting_official_name: string
  country_name: string
  country_code: string
  location: string
  circuit_key: number
  circuit_short_name: string
  circuit_type: string
  circuit_image: string
  date_start: string
  date_end: string
  gmt_offset: string
  is_cancelled: boolean
  year: number
}

export interface Session {
  session_key: number
  meeting_key: number
  session_name: string
  session_type: string
  circuit_short_name: string
  location: string
  gmt_offset: string
  date_start: string
  date_end: string
  is_cancelled: boolean
  year: number
}

export interface Driver {
  driver_number: number
  session_key: number
  meeting_key: number
  broadcast_name: string
  full_name: string
  first_name: string
  last_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  headshot_url: string
}

export interface SessionResult {
  driver_number: number
  session_key: number
  meeting_key: number
  position: number | null
  points?: number
  number_of_laps: number | null
  dnf: boolean
  dns: boolean
  dsq: boolean
  duration: number | (number | null)[] | null
  gap_to_leader: number | string | (number | string | null)[] | null
}
export interface TeamRadio {
  driver_number: number
  session_key: number
  meeting_key: number
  date: string
  recording_url: string
}

export interface Lap {
  driver_number: number
  session_key: number
  meeting_key: number
  lap_number: number
  date_start: string | null
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  i1_speed: number | null
  i2_speed: number | null
  st_speed: number | null
  is_pit_out_lap: boolean
}

export interface CarData {
  driver_number: number
  date: string
  speed: number
  throttle: number
  brake: number
  n_gear: number
  rpm: number
  drs: number | null
}

export interface Location {
  driver_number: number
  date: string
  x: number
  y: number
  z: number
}
