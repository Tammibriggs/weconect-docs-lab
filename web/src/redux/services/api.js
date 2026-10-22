import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  baseQuery: fetchBaseQuery({ 
    baseUrl: process.env.REACT_APP_SEVER_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    }
  }),
  tagTypes: ['User', 'Follow', 'POSTS', 'POST', 'Conversations'],
  endpoints: () => ({})
})

export const { useLoginMutation} = api