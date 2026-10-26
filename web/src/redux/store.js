import { configureStore } from '@reduxjs/toolkit'
// Or from '@reduxjs/toolkit/query/react'
import { api, signOut } from './services/api'
import auth from './authSlice'
import presence from './presenceSlice'
import { TOKEN_KEY, writeStoredToken } from '../lib/session'

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [api.reducerPath]: api.reducer,
    auth,
    presence
  },

  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),

})

// Keep the stored token in step with the signed-in state. Reducers stay pure; this is the only writer.
let savedToken = store.getState().auth.token
store.subscribe(() => {
  const { token } = store.getState().auth
  if (token !== savedToken) {
    savedToken = token
    writeStoredToken(token)
  }
})

// Signing out in another tab signs this tab out too. Signing in there reloads this tab,
// so it starts again with the new session.
window.addEventListener('storage', (event) => {
  if (event.key !== TOKEN_KEY && event.key !== null) return
  const { token } = store.getState().auth
  if (!event.newValue && token) store.dispatch(signOut('elsewhere'))
  else if (event.newValue && event.newValue !== token) window.location.reload()
})
