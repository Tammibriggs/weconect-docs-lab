import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

// The sign-in and sign-up pages. Once there's a session, go to the page the person was
// trying to open before they were asked to sign in, or to Home.
export default function PublicOnly() {
  const token = useSelector((state) => state.auth.token)
  const location = useLocation()
  if (token) return <Navigate to={location.state?.from ?? '/'} replace />
  return <Outlet />
}
