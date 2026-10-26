const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

// "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then "Oct 3",
// or "Oct 3, 2025" for an earlier year.
export function formatRelative(date, now = Date.now()) {
  const then = new Date(date).getTime()
  const diff = now - then
  if (Number.isNaN(then)) return ''
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return relative.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return relative.format(-Math.floor(diff / HOUR), 'hour')
  if (diff < 7 * DAY) return relative.format(-Math.floor(diff / DAY), 'day')
  const sameYear = new Date(then).getFullYear() === new Date(now).getFullYear()
  return new Date(then).toLocaleDateString('en', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

// The full date and time, for a tooltip: "October 24, 2026 at 10:04 AM".
export function formatFull(date) {
  return new Date(date).toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })
}

// "Joined October 2026".
export function formatJoined(date) {
  return `Joined ${new Date(date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}`
}

// "Good morning", "Good afternoon" or "Good evening", for the person's own clock.
export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
