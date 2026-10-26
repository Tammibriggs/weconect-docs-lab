import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useLoginMutation, useRegisterMutation } from "../redux/services/auth";
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/ui/TextField'
import PasswordField from '../components/ui/PasswordField'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import useDocumentTitle from '../lib/useDocumentTitle'
import { startSession } from './Login'

const FIELDS = ['username', 'password', 'confirm']

// The limits the API's User model intends (it doesn't enforce the username one).
function validate({ username, password, confirm }) {
  const found = {}
  const name = username.trim()
  if (name.length < 3 || name.length > 20) found.username = 'Use 3 to 20 characters.'
  if (password.length < 5) found.password = 'Use at least 5 characters.'
  if (confirm !== password) found.confirm = "The passwords don't match."
  return found
}

// Puts the API's validation messages next to the field they're about.
function fieldErrorFrom(error) {
  if (error?.status === 409) return { username: 'That username is taken. Try another one.' }
  const message = error?.data?.message
  if (message === 'Invalid username') return { username: 'Enter a username.' }
  if (message?.startsWith('Password too short')) return { password: 'Use at least 5 characters.' }
  if (message === 'Password does not match') return { confirm: "The passwords don't match." }
  return null
}

export default function SignUp() {
  useDocumentTitle('Create an account')
  const [values, setValues] = useState({ username: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [register, registerState] = useRegisterMutation()
  const [login, loginState] = useLoginMutation()
  const busy = registerState.isLoading || loginState.isLoading
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const refs = { username: useRef(null), password: useRef(null), confirm: useRef(null) }

  const change = (field) => (event) => setValues({ ...values, [field]: event.target.value })
  const showErrors = (found) => {
    setErrors(found)
    const first = FIELDS.find((field) => found[field])
    if (first) refs[first].current.focus()
    return Boolean(first)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy || showErrors(validate(values))) return

    setFormError('')
    const username = values.username.trim()
    try {
      await register({ username, password: values.password, password1: values.confirm }).unwrap()
    } catch (error) {
      if (!showErrors(fieldErrorFrom(error) || {})) {
        setFormError(error?.status === 'FETCH_ERROR'
          ? "Can't reach weConect. Check your connection and try again."
          : 'Something went wrong. Try again in a moment.')
      }
      return
    }

    // The account exists now: sign in with it straight away.
    try {
      const { data } = await login({ username, password: values.password }).unwrap()
      const user = startSession(dispatch, data)
      toast(`Welcome to weConect, ${user.username}!`)
    } catch {
      navigate('/login', { replace: true })
    }
  }

  return (
    <AuthLayout
      title='Create your account'
      intro='It takes a few seconds.'
      footer={<>Already have an account? <Link to='/login'>Sign in</Link></>}
    >
      <form className='auth__form' onSubmit={handleSubmit} noValidate>
        <TextField
          ref={refs.username}
          label='Username'
          name='username'
          hint="3 to 20 characters. You'll use it to sign in."
          value={values.username}
          onChange={change('username')}
          error={errors.username}
          maxLength={20}
          autoComplete='username'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
        />
        <PasswordField
          ref={refs.password}
          label='Password'
          name='password'
          hint='At least 5 characters.'
          value={values.password}
          onChange={change('password')}
          error={errors.password}
          autoComplete='new-password'
        />
        <PasswordField
          ref={refs.confirm}
          label='Confirm password'
          name='confirmpass'
          value={values.confirm}
          onChange={change('confirm')}
          error={errors.confirm}
          autoComplete='new-password'
        />
        {formError && <p className='auth__error' role='alert'>{formError}</p>}
        <Button type='submit' block loading={busy}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
