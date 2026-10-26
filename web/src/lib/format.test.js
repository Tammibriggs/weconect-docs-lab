import { count, formatNumber } from './format'

describe('count', () => {
  it('uses the singular for one', () => {
    expect(count(1, 'follower')).toBe('1 follower')
  })

  it('uses the plural for zero and many', () => {
    expect(count(0, 'follower')).toBe('0 followers')
    expect(count(3, 'follower')).toBe('3 followers')
  })

  it('takes an irregular plural', () => {
    expect(count(2, 'person', 'people')).toBe('2 people')
  })
})

describe('formatNumber', () => {
  it('shortens big numbers', () => {
    expect(formatNumber(1234)).toBe('1.2K')
    expect(formatNumber(999)).toBe('999')
  })
})
