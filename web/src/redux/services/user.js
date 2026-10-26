import {api} from './api'

// The followers and following endpoints return { id, username, image, following }, unlike
// every other user response. This gives them the shape the rest of the app uses, so
// pictures show up (the API calls the picture `image` here, not `profilePicture`).
const toPerson = ({ id, username, image, following }) => ({
  _id: id,
  username,
  profilePicture: image,
  followsBack: Boolean(following),
})

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // The signed-in user. authSlice.js copies the result into state.auth.user.
    getUser: builder.query({
      query: () => 'users',
      providesTags: ['Me']
    }),
    // Any user, by ID as a plain string. Kept for 5 minutes, since the same authors repeat.
    getUserById: builder.query({
      query: (id) => `users/${id}/user`,
      transformResponse: (response) => response.data,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      keepUnusedDataFor: 300,
    }),
    getFollowers: builder.query({
      query: () => `users/followers`,
      transformResponse: (response) => response.data.map(toPerson),
      providesTags: ['Connections']
    }),
    getFollowing: builder.query({
      query: () => `users/following`,
      transformResponse: (response) => response.data.map((person) => ({ ...toPerson(person), followsBack: undefined })),
      providesTags: ['Connections']
    }),
    // People whose username contains `term`. API 1.0 included each user's encrypted
    // password (TESTING.md finding 1, fixed in 1.1); dropping it here stays as a safeguard.
    searchUsers: builder.query({
      query: (term) => ({ url: 'users/search', params: { search: term } }),
      transformResponse: (response) => response.data.map(({ password, ...user }) => user),
      keepUnusedDataFor: 30,
    }),
    // Saves your username, bio and pictures. `id` is your user ID, for refreshing caches.
    updateMe: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `users`,
        method: 'PUT',
        body,
      }),
      // Only after a successful save: refreshing after a failure would change nothing.
      invalidatesTags: (result, error, { id }) => (error ? [] : ['Me', { type: 'User', id }])
    }),
    // Both take the other user's ID. They refresh only what a follow changes: you, the
    // other person, your lists, and your timeline. A 403 ("you already follow this user")
    // means the app was out of date, so it refreshes then too.
    follow: builder.mutation({
      query: (userId) => ({
        url: `users/follow`,
        method: 'PUT',
        body: {
          userId
        }
      }),
      invalidatesTags: (result, error, userId) => ['Me', 'Connections', 'POSTS', { type: 'User', id: userId }]
    }),
    unfollow: builder.mutation({
      query: (userId) => ({
        url: `users/unfollow`,
        method: 'PUT',
        body: {
          userId
        }
      }),
      invalidatesTags: (result, error, userId) => ['Me', 'Connections', 'POSTS', { type: 'User', id: userId }]
    })
  }),
  overrideExisting: false,
})

export const {
  useGetFollowersQuery,
  useGetFollowingQuery,
  useFollowMutation,
  useUnfollowMutation,
  useGetUserQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useSearchUsersQuery,
  useUpdateMeMutation
} = userApi
