import {api} from './api'

// The API returns lists in its own order (your posts first, then each followed user's) and can
// repeat a post (a user who follows themselves). Every list here is deduped and newest first.
export function normalizePosts(response) {
  const seen = new Set()
  return (response?.data ?? [])
    .filter((post) => post && !seen.has(post._id) && seen.add(post._id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || (a._id < b._id ? 1 : -1))
}

export const postApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTimeline: builder.query({
      query: () => 'posts/timeline/all',
      transformResponse: normalizePosts,
      providesTags: ['POSTS'],
    }),
    // A user's posts. The argument is the user's ID as a plain string.
    getUserPosts: builder.query({
      query: (userId) => `posts/${userId}`,
      transformResponse: normalizePosts,
      providesTags: ['POSTS'],
    }),
    createPost: builder.mutation({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      // Show the new post at the top of both lists without asking the API for them again.
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        let post
        try {
          ({ data: post } = await queryFulfilled)
        } catch {
          return // The composer shows the error.
        }
        dispatch(postApi.util.updateQueryData('getTimeline', undefined, (list) => { list.unshift(post) }))
        dispatch(postApi.util.updateQueryData('getUserPosts', post.userId, (list) => { list.unshift(post) }))
      },
    }),
    deletePost: builder.mutation({
      query: (postId) => ({
        url: `posts/${postId}`,
        method: 'DELETE',
        body: {}
      }),
    }),
    // The API toggles: the same request likes and unlikes. The change shows straight away in
    // every cached list that has the post, and is undone if the request fails. Nothing is
    // fetched again, so nothing races the API while it restarts after an unlike (finding 6).
    toggleLike: builder.mutation({
      query: ({ post, userId }) => ({
        url: `posts/${post._id}/like`,
        method: 'PUT',
        body: { userId },
      }),
      async onQueryStarted({ post, userId }, { dispatch, queryFulfilled }) {
        const toggle = (list) => {
          const target = list.find((p) => p._id === post._id)
          if (!target) return
          const i = target.likes.indexOf(userId)
          if (i === -1) target.likes.push(userId)
          else target.likes.splice(i, 1)
        }
        const patches = [
          dispatch(postApi.util.updateQueryData('getTimeline', undefined, toggle)),
          dispatch(postApi.util.updateQueryData('getUserPosts', post.userId, toggle)),
        ]
        try {
          await queryFulfilled
        } catch {
          patches.forEach((patch) => patch.undo())
        }
      },
    }),
  }),
  overrideExisting: false,
})

// Takes a deleted post out of every cached list.
export const removePostFromLists = (post) => (dispatch) => {
  const remove = (list) => list.filter((p) => p._id !== post._id)
  dispatch(postApi.util.updateQueryData('getTimeline', undefined, remove))
  dispatch(postApi.util.updateQueryData('getUserPosts', post.userId, remove))
}

export const {
  useGetTimelineQuery,
  useGetUserPostsQuery,
  useCreatePostMutation,
  useDeletePostMutation,
  useToggleLikeMutation,
} = postApi
