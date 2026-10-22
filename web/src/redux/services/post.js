import {api} from './api'

const postApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPost: builder.query({
      query: ({postId}) => `posts/${postId}/single`,
      providesTags: ['POST']
    }),
    getTimelinePost: builder.query({
      query: () => 'posts/timeline/all',
      providesTags: ['POSTS']
    }),
    getPosts: builder.query({
      query: ({userId}) => `posts/${userId}`,
      providesTags: ['POSTS']
    }),
    createPost: builder.mutation({
      query: ({userId, desc, img}) => ({
        url: `posts`,
        method: 'POST',
        body: {
          userId,
          desc,
          img
        }
      }),
      invalidatesTags: ['POSTS']
    }),
    deletePost: builder.mutation({
      query: ({postId}) => ({
        url: `posts/${postId}`,
        method: 'DELETE',
        body: {}
      }),
      invalidatesTags: ['POSTS']
    }),
    likeNdislikePost: builder.mutation({
      query: ({postId, userId}) => ({
        url: `posts/${postId}/like`,
        method: 'PUT',
        body: {
          userId
        }
      }),
      invalidatesTags: ['POST']
    }),
  }), 
  overrideExisting: false,
})

export const { 
  useCreatePostMutation,
  useGetPostsQuery,
  useGetTimelinePostQuery,
  useGetPostQuery,
  useLikeNdislikePostMutation,
  useDeletePostMutation
} = postApi