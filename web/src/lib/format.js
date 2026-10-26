const compact = new Intl.NumberFormat('en', { notation: 'compact' })
const plurals = new Intl.PluralRules('en')

// 1,234 → "1.2K".
export const formatNumber = (value) => compact.format(value)

// count(1, 'follower') → "1 follower"; count(3, 'follower') → "3 followers".
export function count(value, singular, plural = `${singular}s`) {
  return `${formatNumber(value)} ${plurals.select(value) === 'one' ? singular : plural}`
}
