import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import { signedOut } from '../authActions'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_SEVER_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  }
})

// The API answers 403 for a bad or expired token, but also for conflicts such as
// "you already follow this user". Only real authentication failures end the session.
export const isAuthFailure = (error) =>
  error?.status === 401 ||
  (error?.status === 403 && (error.data?.expired === true || error.data?.message === 'Token is invalid'))

const withAuth = async (args, baseQueryApi, extraOptions) => {
  const tokenAtStart = baseQueryApi.getState().auth.token
  const result = await rawBaseQuery(args, baseQueryApi, extraOptions)
  const sameSession = tokenAtStart && tokenAtStart === baseQueryApi.getState().auth.token
  if (result.error && sameSession && isAuthFailure(result.error) && !['login', 'register'].includes(baseQueryApi.endpoint)) {
    baseQueryApi.dispatch(signOut(result.error.data?.expired ? 'expired' : 'invalid'))
  }
  return result
}

// Retry reads after network errors: the API restarts after an unlike crashes it.
// Never retry writes: a repeated like would undo itself, and a repeated post would be created twice.
const baseQuery = retry(withAuth, {
  retryCondition: (error, args, { attempt, baseQueryApi }) =>
    baseQueryApi.type === 'query' && error.status === 'FETCH_ERROR' && attempt <= 3,
})

export const api = createApi({
  baseQuery,
  tagTypes: ['Me', 'User', 'Connections', 'POSTS', 'Conversations', 'ApiKeys'],
  endpoints: () => ({})
})

// Ends the session: forgets the token and every cached response, so the next person
// to sign in on this device sees none of the previous person's data.
export const signOut = (reason = null) => (dispatch) => {
  dispatch(signedOut(reason))
  dispatch(api.util.resetApiState())
}
