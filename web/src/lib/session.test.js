import { decodeToken, readStoredToken, TOKEN_KEY } from './session'

const b64url = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const token = (payload) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.signature`
const NOW = Date.UTC(2026, 9, 25, 12, 0, 0)

afterEach(() => localStorage.clear())

describe('decodeToken', () => {
  it('reads the payload of a JWT', () => {
    expect(decodeToken(token({ id: 'abc', exp: 123 }))).toEqual({ id: 'abc', exp: 123 })
  })

  it('returns null for something that is not a JWT', () => {
    expect(decodeToken('not-a-jwt')).toBeNull()
    expect(decodeToken('a.b.c')).toBeNull()
  })
})

describe('readStoredToken', () => {
  it('keeps a token with more than a minute left', () => {
    const fresh = token({ id: 'abc', exp: NOW / 1000 + 3600 })
    localStorage.setItem(TOKEN_KEY, fresh)
    expect(readStoredToken(NOW)).toEqual({ token: fresh, notice: null })
  })

  it('removes an expired token and says the session expired', () => {
    localStorage.setItem(TOKEN_KEY, token({ id: 'abc', exp: NOW / 1000 - 1 }))
    expect(readStoredToken(NOW)).toEqual({ token: null, notice: 'expired' })
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('treats a token that expires within a minute as expired', () => {
    localStorage.setItem(TOKEN_KEY, token({ id: 'abc', exp: NOW / 1000 + 30 }))
    expect(readStoredToken(NOW).token).toBeNull()
  })

  it('removes a malformed token without a notice', () => {
    localStorage.setItem(TOKEN_KEY, 'not-a-jwt')
    expect(readStoredToken(NOW)).toEqual({ token: null, notice: null })
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('returns no session when there is no token', () => {
    expect(readStoredToken(NOW)).toEqual({ token: null, notice: null })
  })
})
