import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router-dom'
import PrimaryNav from './PrimaryNav'
import AsidePanel from './AsidePanel'
import { SocketProvider } from '../realtime/SocketProvider'
import '../styles/shell.css'

// The frame around every signed-in page: navigation, the page itself in <main>, and on
// wide screens an aside. Routes can set handle: { layout: 'wide' } for the full width, and
// handle: { hideTabBar: true } to hide the phone tab bar (a chat needs the whole screen).
export default function AppShell() {
  const matches = useMatches()
  const wide = matches.some((match) => match.handle?.layout === 'wide')
  const hideTabBar = matches.some((match) => match.handle?.hideTabBar)
  const location = useLocation()
  // The path focus was last moved for. Comparing paths (rather than skipping the "first
  // render") stays right when StrictMode runs effects twice.
  const focusedPath = useRef(location.pathname)

  // After moving to another page, put focus on its heading, so screen readers announce
  // the new page and keyboard users start from the top of it. A page can point at a more
  // specific heading with data-page-heading, such as the open chat.
  useEffect(() => {
    if (focusedPath.current === location.pathname) return
    focusedPath.current = location.pathname
    const heading = document.querySelector('main [data-page-heading]') || document.querySelector('main h1')
    heading?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <SocketProvider>
      <div className='shell' data-layout={wide ? 'wide' : undefined} data-hide-tabbar={hideTabBar || undefined}>
        <a
          className='skip-link'
          href='#main'
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('main').focus()
          }}
        >
          Skip to content
        </a>
        <PrimaryNav />
        <main id='main' className='shell__main' tabIndex={-1}>
          <Outlet />
        </main>
        {!wide && <AsidePanel />}
      </div>
    </SocketProvider>
  )
}
