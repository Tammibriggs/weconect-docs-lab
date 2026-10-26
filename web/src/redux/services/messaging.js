import {api} from './api'
import { messageReceived } from '../presenceSlice'

const oldestFirst = (a, b) => new Date(a.createdAt) - new Date(b.createdAt)

export const messagingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query({
      query: () => `conversations`,
      transformResponse: (response) => response.data,
      providesTags: ['Conversations']
    }),
    // Careful: in v1 this returns *any* conversation you're already in, not necessarily one
    // with `receiverId` (api/routes/conversations.js:20-23). Check `members` before using it.
    createConversation: builder.mutation({
      query: (({senderId, receiverId}) => ({
        url: 'conversations',
        method: 'POST',
        body: {
          senderId,
          receiverId,
        }
      })),
      transformResponse: (response) => response.data,
      invalidatesTags: (result, error) => (error ? [] : ['Conversations'])
    }),
    // A conversation's messages, by conversation ID, oldest first (the API doesn't sort them).
    getMessages: builder.query({
      query: (conversationId) => `messages/${conversationId}`,
      transformResponse: (response) => [...response.data].sort(oldestFirst),
    }),
    // Saves a message, then adds it to the cached conversation.
    addMessage: builder.mutation({
      query: (({conversationId, sender, text}) => ({
        url: 'messages',
        method: 'POST',
        body: {
          conversationId,
          sender,
          text,
        }
      })),
      transformResponse: (response) => response.data,
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        try {
          const { data: message } = await queryFulfilled
          dispatch(messagingApi.util.updateQueryData('getMessages', conversationId, (list) => { list.push(message) }))
        } catch {
          // The chat shows the error and keeps the text.
        }
      },
    })
  }),
  overrideExisting: false,
})

// A message pushed by the socket, { senderId, text }. The sender already saved it, so it
// goes straight into the cached conversation; if that conversation isn't cached yet, the
// list of conversations is fetched again.
export const receiveMessage = ({ senderId, text }) => (dispatch, getState) => {
  const conversations = messagingApi.endpoints.getConversations.select()(getState()).data ?? []
  const conversation = conversations.find((c) => c.members.includes(senderId))
  if (conversation) {
    const message = { _id: `live-${Date.now()}`, conversationId: conversation._id, sender: senderId, text, createdAt: new Date().toISOString() }
    dispatch(messagingApi.util.updateQueryData('getMessages', conversation._id, (list) => { list.push(message) }))
  } else {
    dispatch(messagingApi.util.invalidateTags(['Conversations']))
  }
  dispatch(messageReceived(senderId))
}

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessagesQuery,
  useAddMessageMutation,
} = messagingApi
