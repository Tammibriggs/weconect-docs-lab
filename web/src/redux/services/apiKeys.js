import { api } from './api'

// The API keys page (pages/ApiKeys.js). These endpoints are internal: they accept the
// signed-in session's token, never an API key, so a leaked key can't create more keys.
export const apiKeysApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getApiKeys: builder.query({
      query: () => 'keys',
      transformResponse: (response) => response.data,
      providesTags: ['ApiKeys'],
    }),
    // The response is the only time the API returns the key itself.
    // Caches refresh only on success: RTK Query would otherwise refetch after a failure too.
    createApiKey: builder.mutation({
      query: ({ name, scopes }) => ({ url: 'keys', method: 'POST', body: { name, scopes } }),
      transformResponse: (response) => response.data,
      invalidatesTags: (result) => (result ? ['ApiKeys'] : []),
    }),
    deleteApiKey: builder.mutation({
      query: (id) => ({ url: `keys/${id}`, method: 'DELETE' }),
      invalidatesTags: (result) => (result ? ['ApiKeys'] : []),
    }),
  }),
})

export const { useGetApiKeysQuery, useCreateApiKeyMutation, useDeleteApiKeyMutation } = apiKeysApi
