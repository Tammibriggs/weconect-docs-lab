import {api} from './api'

const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUser: builder.query({
      query: () => 'users',
      providesTags: ['Follow', 'User']
    }),
    getUserById: builder.query({
      query: ({id}) => `users/${id}/user`,
      providesTags: ['User', 'Follow']
    }),
    getFollowers: builder.query({
      query: () => `users/followers`,
      providesTags: ['Follow']
    }),
    getFollowing: builder.query({
      query: () => `users/following`,
      providesTags: ['Follow']
    }),
    updateUser: builder.mutation({
      query: ({username, bio, coverPicture, profilePicture}) => ({
        url: `users`,
        method: 'PUT',
        body: {
          username,
          bio,
          coverPicture,
          profilePicture 
        }
      }),
      invalidatesTags: ['User']
    }),
    follow: builder.mutation({
      query: ({userId}) => ({
        url: `users/follow`,
        method: 'PUT',
        body: {
          userId
        }
      }),
      invalidatesTags: ['Follow']
    }),
    unfollow: builder.mutation({
      query: ({userId}) => ({
        url: `users/unfollow`,
        method: 'PUT',
        body: {
          userId
        }
      }),
      invalidatesTags: ['Follow']
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
  useUpdateUserMutation
} = userApi