import { createSlice } from '@reduxjs/toolkit'
import { signedOut } from './authActions'

// Who's online and how many messages arrived while you weren't looking, both from the socket.
// The API has no unread state, so the counts last for this session only.
const initialState = { online: [], unread: {}, activeChat: null }

const slice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    onlineChanged: (state, { payload: userIds }) => {
      state.online = userIds
    },
    chatOpened: (state, { payload: userId }) => {
      state.activeChat = userId
      delete state.unread[userId]
    },
    chatClosed: (state) => {
      state.activeChat = null
    },
    messageReceived: (state, { payload: senderId }) => {
      if (state.activeChat !== senderId) state.unread[senderId] = (state.unread[senderId] || 0) + 1
    },
  },
  extraReducers: (builder) => {
    builder.addCase(signedOut, () => initialState)
  },
})

export const { onlineChanged, chatOpened, chatClosed, messageReceived } = slice.actions
export default slice.reducer
