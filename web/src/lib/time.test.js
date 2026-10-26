import { formatRelative, greeting } from './time'

const NOW = new Date(2026, 9, 25, 12, 0, 0).getTime()
const ago = (ms) => new Date(NOW - ms).toISOString()
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatRelative', () => {
  it.each([
    [30 * 1000, 'just now'],
    [MINUTE, '1 minute ago'],
    [5 * MINUTE, '5 minutes ago'],
    [3 * HOUR, '3 hours ago'],
    [DAY, 'yesterday'],
    [4 * DAY, '4 days ago'],
  ])('%i ms ago is "%s"', (ms, expected) => {
    expect(formatRelative(ago(ms), NOW)).toBe(expected)
  })

  it('shows the date after a week', () => {
    expect(formatRelative(new Date(2026, 9, 3).toISOString(), NOW)).toBe('Oct 3')
  })

  it('adds the year for an earlier year', () => {
    expect(formatRelative(new Date(2025, 9, 3).toISOString(), NOW)).toBe('Oct 3, 2025')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatRelative('not a date', NOW)).toBe('')
  })
})

describe('greeting', () => {
  it.each([
    [8, 'Good morning'],
    [13, 'Good afternoon'],
    [20, 'Good evening'],
  ])('at %i:00 it is "%s"', (hour, expected) => {
    expect(greeting(new Date(2026, 9, 25, hour))).toBe(expected)
  })
})
