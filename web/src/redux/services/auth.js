import {api} from './api'

const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (({username, password, password1}) => ({
        url: 'auth/register',
        method: 'POST',
        body: {
          username,
          password,
          password1
        }
      }))
    }),
    login: builder.mutation({
      query: (({username, password}) => ({
        url: 'auth/login',
        method: 'POST',
        body: {
          username,
          password,
        }
      }))
    })
  }),
  overrideExisting: false,
})

export const { useRegisterMutation, useLoginMutation } = authApi