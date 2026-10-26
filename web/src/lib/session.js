// Where the sign-in token is kept between visits, and how it's checked before use.
export const TOKEN_KEY = 'weconect.token'

// Reads a JWT's payload without verifying it. The API checks the signature; the app only
// needs `id` and `exp`, so it can skip a request that would fail anyway.
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

// The token from an earlier visit, if it still has more than a minute left.
// `notice` tells the sign-in page why there's no session.
export function readStoredToken(now = Date.now()) {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return { token: null, notice: null }
    const payload = decodeToken(token)
    if (payload?.exp && payload.exp * 1000 > now + 60_000) return { token, notice: null }
    localStorage.removeItem(TOKEN_KEY)
    return { token: null, notice: payload?.exp ? 'expired' : null }
  } catch {
    // Storage is blocked (for example, in some private windows): the session lasts until the tab closes.
    return { token: null, notice: null }
  }
}

export function writeStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}
