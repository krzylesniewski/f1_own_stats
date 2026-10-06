export const FIRST_YEAR = 2023
export const CURRENT_YEAR = new Date().getFullYear()

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** 90.641 → "1:30.641", 6434.808 → "1:47:14.808" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = (seconds % 60).toFixed(3).padStart(6, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`
  if (m > 0) return `${m}:${s}`
  return (seconds % 60).toFixed(3)
}

/** Gap is seconds, or a string like "+1 LAP" for lapped cars. */
export const formatGap = (gap: number | string) => (typeof gap === 'number' ? `+${gap.toFixed(3)}` : gap)
