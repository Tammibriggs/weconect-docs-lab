import { isAuthFailure } from './api'

// The bodies are the API's own, from tests/captures/v1.
describe('isAuthFailure', () => {
  it('is true for a missing token (401)', () => {
    expect(isAuthFailure({ status: 401, data: { status: 'error', message: 'You are not authenticated!' } })).toBe(true)
  })

  it('is true for an invalid token (403)', () => {
    expect(isAuthFailure({ status: 403, data: { status: 'error', message: 'Token is invalid' } })).toBe(true)
  })

  it('is true for an expired token (403)', () => {
    expect(isAuthFailure({ status: 403, data: { status: 'error', expired: true, message: 'Your session has expired' } })).toBe(true)
  })

  it('is false for the 403s that are about something else', () => {
    expect(isAuthFailure({ status: 403, data: { status: 'error', message: 'you already follow this user' } })).toBe(false)
    expect(isAuthFailure({ status: 403, data: "you don't follow this user" })).toBe(false)
    expect(isAuthFailure({ status: 403, data: { status: 'error', message: 'you can delete only your post' } })).toBe(false)
  })

  it('is false for server and network errors', () => {
    expect(isAuthFailure({ status: 500, data: {} })).toBe(false)
    expect(isAuthFailure({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' })).toBe(false)
  })
})
