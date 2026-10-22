import {api} from './api'

const messagingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query({
      query: () => `conversations`,
      providesTags: ['Conversations']
    }),
    createConversation: builder.mutation({
      query: (({senderId, receiverId}) => ({
        url: 'conversations',
        method: 'POST',
        body: {
          senderId,
          receiverId,
        }
      })),
      invalidatesTags: ['Conversations']
    }),
    getMessages: builder.query({
      query: ({conversationId}) => `messages/${conversationId}`,
    }),
    getLatestMessage: builder.query({
      query: ({coversationId}) => `messages/${coversationId}/message`
    }),
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessagesQuery,
  useAddMessageMutation,
  useLazyGetMessagesQuery,
  useGetLatestMessageQuery,
} = messagingApi