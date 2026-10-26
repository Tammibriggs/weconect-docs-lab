import DynamicFeed from '@mui/icons-material/DynamicFeedOutlined'
import Forum from '@mui/icons-material/ForumOutlined'
import PersonSearch from '@mui/icons-material/PersonSearchOutlined'
import Favorite from '@mui/icons-material/Favorite'
import Logo from './Logo'
import Avatar from './ui/Avatar'
import '../styles/auth.css'

// A small, decorative glimpse of the app: a post and a short chat.
function Preview() {
  return (
    <div className='auth-preview' aria-hidden='true'>
      <div className='auth-preview__post'>
        <div className='auth-preview__who'>
          <Avatar name='carol' size='sm' />
          <span>
            <strong>carol</strong>
            <small>just now</small>
          </span>
        </div>
        <p>New print is up in the studio. Come say hi!</p>
        <span className='auth-preview__likes'><Favorite /> 24</span>
      </div>
      <p className='auth-preview__bubble auth-preview__bubble--them'>Coffee on Thursday?</p>
      <p className='auth-preview__bubble auth-preview__bubble--me'>Yes! See you there.</p>
    </div>
  )
}

// The frame for the sign-in and sign-up pages: on wide screens a light panel says what
// weConect is, and the form sits beside it. On smaller screens the logo sits above the form.
export default function AuthLayout({ title, intro, children, footer }) {
  return (
    <div className='auth'>
      <section className='auth__brand' aria-label='About weConect'>
        <Logo size={40} />
        <p className='auth__tagline'>Share what's happening with the people you follow.</p>
        <ul className='auth__points'>
          <li><DynamicFeed /> See the latest posts from people you follow</li>
          <li><Forum /> Message your friends</li>
          <li><PersonSearch /> Find people to follow</li>
        </ul>
        <Preview />
      </section>
      <main className='auth__main' id='main'>
        <div className='auth__card'>
          <div className='auth__logo'><Logo size={36} /></div>
          <div className='auth__heading'>
            <h1 className='auth__title'>{title}</h1>
            {intro && <p className='auth__intro'>{intro}</p>}
          </div>
          {children}
          {footer && <p className='auth__footer'>{footer}</p>}
        </div>
      </main>
    </div>
  )
}
