import { lazy, Suspense } from 'react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router-dom'
import App from './App'
import PublicOnly from './routes/PublicOnly'
import RequireAuth from './routes/RequireAuth'
import AppShell from './components/AppShell'
import PageLoading from './components/ui/PageLoading'
import RouteError from './pages/RouteError'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Home from './pages/Home'
import Compose from './pages/Compose'
import Search from './pages/Search'
import Profile, { ProfileRedirect } from './pages/Profile'
import Connections from './pages/Connections'
import NotFound from './pages/NotFound'

// Messages downloads separately, the first time someone opens it.
const Messages = lazy(() => import('./pages/Messages'))
const ChatPlaceholder = lazy(() => import('./pages/Messages').then((module) => ({ default: module.ChatPlaceholder })))
const ChatPanel = lazy(() => import('./components/ChatPanel'))
// So does the API keys page, which most people never open.
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const later = (element) => <Suspense fallback={<PageLoading />}>{element}</Suspense>

// Every route works at every screen width; the layout adapts with CSS (styles/shell.css).
export const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<App />} errorElement={<RouteError />}>
    {/* Signed out only. With a session, these redirect to Home. */}
    <Route element={<PublicOnly />}>
      <Route path='login' element={<Login />} />
      <Route path='signup' element={<SignUp />} />
    </Route>

    {/* Signed in only. Without a session, these redirect to /login and come back afterwards. */}
    <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path='compose' element={<Compose />} />
        <Route path='search' element={<Search />} />
        <Route path='profile' element={<ProfileRedirect />} />
        <Route path='profile/:userId' element={<Profile />} />
        <Route path='followers' element={<Connections tab='followers' />} />
        <Route path='following' element={<Connections tab='following' />} />
        <Route path='messages' element={later(<Messages />)} handle={{ layout: 'wide' }}>
          <Route index element={later(<ChatPlaceholder />)} />
          {/* On phones a chat fills the screen, so the tab bar hides. */}
          <Route path=':userId' element={later(<ChatPanel />)} handle={{ hideTabBar: true }} />
        </Route>
        <Route path='messaging' element={<Navigate to='/messages' replace />} />
        <Route path='settings/api-keys' element={later(<ApiKeys />)} />
        <Route path='*' element={<NotFound />} />
      </Route>
    </Route>
  </Route>
))
