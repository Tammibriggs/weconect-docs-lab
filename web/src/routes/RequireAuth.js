import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useGetUserQuery } from '../redux/services/user'
import { signOut } from '../redux/services/api'
import { LogoMark } from '../components/Logo'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import '../styles/boot.css'

// Signed-in pages render only with a token *and* a loaded user, so no page ever sees
// `user: null`. After a reload there's only the stored token: this shows a splash while
// GET /users checks it. If the API rejects the token, services/api.js signs out, and the
// redirect below takes the person to the sign-in page.
export default function RequireAuth() {
  const { token, user } = useSelector((state) => state.auth)
  const location = useLocation()
  const dispatch = useDispatch()
  // This subscription also keeps the signed-in user fresh for the whole session.
  const { isError, isFetching, refetch } = useGetUserQuery(undefined, { skip: !token })

  if (!token) return <Navigate to='/login' replace state={{ from: location }} />
  if (user) return <Outlet />

  return (
    <main className='boot'>
      <LogoMark size={56} />
      {isError && !isFetching ? (
        <div className='boot__error' role='alert'>
          <h1>Can't reach weConect</h1>
          <p>Check your connection and try again.</p>
          <div className='boot__actions'>
            <Button onClick={refetch}>Try again</Button>
            <Button variant='secondary' onClick={() => dispatch(signOut())}>Sign out</Button>
          </div>
        </div>
      ) : (
        <Spinner size='lg' label='Loading weConect' />
      )}
    </main>
  )
}
