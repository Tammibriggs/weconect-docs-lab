import { createAction } from '@reduxjs/toolkit'

// In its own file so authSlice.js and services/api.js can both use it without an import cycle.
// `reason` is shown on the sign-in page: 'expired', 'invalid', 'elsewhere' or 'signedOut'.
export const signedOut = createAction('auth/signedOut', (reason = null) => ({ payload: { reason } }))
