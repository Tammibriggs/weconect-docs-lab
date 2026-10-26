import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLoginMutation } from "../redux/services/auth";
import { userApi } from "../redux/services/user";
import { setCredentials } from "../redux/authSlice";
import AuthLayout from "../components/AuthLayout";
import TextField from "../components/ui/TextField";
import PasswordField from "../components/ui/PasswordField";
import Button from "../components/ui/Button";
import useDocumentTitle from "../lib/useDocumentTitle";

// Why there's no session, from state.auth.notice.
const NOTICES = {
  expired: 'Your session expired. Sign in again.',
  invalid: "You've been signed out. Sign in again.",
  elsewhere: 'You signed out in another tab.',
  signedOut: "You've signed out.",
}

// The API answers 404 for an unknown username and 400 for a wrong password.
// One message for both, so the page doesn't reveal which usernames exist.
export function signInError(error) {
  if (error?.status === 400 || error?.status === 404) return "That username and password don't match. Check them and try again."
  if (error?.status === 'FETCH_ERROR') return "Can't reach weConect. Check your connection and try again."
  return 'Something went wrong. Try again in a moment.'
}

// Saves the session from a login response. Seeding the current-user cache means
// the app doesn't ask the API for the same user again right away.
export function startSession(dispatch, data) {
  const { accessToken, ...user } = data
  dispatch(userApi.util.upsertQueryData('getUser', undefined, { status: 'ok', data: user }))
  dispatch(setCredentials({ user, token: accessToken }))
  return user
}

export default function Login() {
  useDocumentTitle('Sign in')
  const [values, setValues] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const notice = useSelector((state) => state.auth.notice)
  const dispatch = useDispatch()
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  const change = (field) => (event) => setValues({ ...values, [field]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isLoading) return
    const found = {}
    if (!values.username.trim()) found.username = 'Enter your username.'
    if (!values.password) found.password = 'Enter your password.'
    setErrors(found)
    if (found.username) return usernameRef.current.focus()
    if (found.password) return passwordRef.current.focus()

    setFormError('')
    try {
      const { data } = await login({ username: values.username.trim(), password: values.password }).unwrap()
      startSession(dispatch, data)
    } catch (error) {
      setFormError(signInError(error))
    }
  }

  return (
    <AuthLayout
      title='Sign in to weConect'
      footer={<>New to weConect? <Link to='/signup'>Create an account</Link></>}
    >
      {NOTICES[notice] && <p className='auth__notice' role='status'>{NOTICES[notice]}</p>}
      <form className='auth__form' onSubmit={handleSubmit} noValidate>
        <TextField
          ref={usernameRef}
          label='Username'
          name='username'
          value={values.username}
          onChange={change('username')}
          error={errors.username}
          autoComplete='username'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
        />
        <PasswordField
          ref={passwordRef}
          label='Password'
          name='password'
          value={values.password}
          onChange={change('password')}
          error={errors.password}
          autoComplete='current-password'
        />
        {formError && <p className='auth__error' role='alert'>{formError}</p>}
        <Button type='submit' block loading={isLoading}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
