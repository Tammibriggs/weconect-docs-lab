import { createSlice } from "@reduxjs/toolkit";
import { signedOut } from "./authActions";
import { userApi } from "./services/user";
import { decodeToken, readStoredToken } from "../lib/session";

const slice = createSlice({
  name: "auth",
  // A function, so the stored token is read when the store is created, not when this file loads.
  initialState: () => ({ user: null, ...readStoredToken() }),
  reducers: {
    setCredentials: (
      state,
      { payload: { user, token} }
    ) => {
      state.user = user
      state.token = token
      state.notice = null
    },
    noticeDismissed: (state) => {
      state.notice = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, (state, { payload }) => {
        state.user = null
        state.token = null
        state.notice = payload.reason
      })
      // After a reload there's only a token, so the signed-in user comes from GET /users.
      // A late answer for an earlier session is ignored.
      .addMatcher(userApi.endpoints.getUser.matchFulfilled, (state, { payload }) => {
        if (state.token && decodeToken(state.token)?.id === payload.data?._id) {
          state.user = payload.data
        }
      })
  },
});

export const { setCredentials, noticeDismissed } = slice.actions;

export default slice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
