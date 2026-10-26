import { Link, matchPath, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Home from '@mui/icons-material/Home'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import Search from '@mui/icons-material/Search'
import AddBox from '@mui/icons-material/AddBox'
import AddBoxOutlined from '@mui/icons-material/AddBoxOutlined'
import Email from '@mui/icons-material/Email'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import PeopleAlt from '@mui/icons-material/PeopleAlt'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import Person from '@mui/icons-material/Person'
import PersonOutline from '@mui/icons-material/PersonOutline'
import Logout from '@mui/icons-material/Logout'
import Logo from './Logo'
import Avatar from './ui/Avatar'
import IconButton from './ui/IconButton'
import { signOut } from '../redux/services/api'
import '../styles/nav.css'

// One nav item. It's the current page when the location matches one of `paths`;
// the icon is filled for the current page and outlined otherwise.
function NavItem({ to, paths = [to], label, icon, activeIcon, className, badge = 0 }) {
  const { pathname } = useLocation()
  const current = paths.some((path) => matchPath({ path, end: true }, pathname))
  return (
    <li className={['nav__entry', className].filter(Boolean).join(' ')}>
      <Link
        to={to}
        className='nav__item'
        aria-current={current ? 'page' : undefined}
        aria-label={badge > 0 ? `${label}, ${badge} unread` : undefined}
      >
        <span className='nav__icon' aria-hidden='true'>
          {current ? activeIcon : icon}
          {badge > 0 && <span className='nav__badge'>{badge > 9 ? '9+' : badge}</span>}
        </span>
        <span className='nav__label'>{label}</span>
      </Link>
    </li>
  )
}

// The main navigation, rendered once. styles/nav.css lays it out as a bottom tab bar on
// phones, an icon rail on tablets, and a labeled sidebar on desktops.
export default function PrimaryNav() {
  const me = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const profile = `/profile/${me._id}`
  // Messages that arrived this session in chats you weren't looking at.
  const unread = useSelector((state) => Object.values(state.presence.unread).reduce((sum, n) => sum + n, 0))

  return (
    <nav className='nav' aria-label='Primary'>
      <Link to='/' className='nav__brand'><Logo size={36} /></Link>
      <ul className='nav__list'>
        <NavItem to='/' label='Home' icon={<HomeOutlined />} activeIcon={<Home />} />
        <NavItem to='/search' label='Search' icon={<Search />} activeIcon={<Search />} />
        {/* On phones, Post sits in the middle of the tab bar; on bigger screens it's a button at the end. */}
        <NavItem to='/compose' label='Post' icon={<AddBoxOutlined />} activeIcon={<AddBox />} className='nav__entry--post nav__entry--phone' />
        <NavItem to='/messages' paths={['/messages', '/messages/:userId']} label='Messages' icon={<EmailOutlined />} activeIcon={<Email />} badge={unread} />
        <NavItem to='/followers' paths={['/followers', '/following']} label='People' icon={<PeopleAltOutlined />} activeIcon={<PeopleAlt />} className='nav__entry--wide' />
        <NavItem to={profile} label='Profile' icon={<PersonOutline />} activeIcon={<Person />} />
        <NavItem to='/compose' label='Post' icon={<AddBoxOutlined />} activeIcon={<AddBox />} className='nav__entry--post nav__entry--wide' />
      </ul>
      <div className='nav__account'>
        <span className='nav__me'>
          <Avatar user={me} size='sm' />
          <span className='nav__me-name'>{me.username}</span>
        </span>
        <IconButton label='Sign out' icon={<Logout />} onClick={() => dispatch(signOut('signedOut'))} />
      </div>
    </nav>
  )
}
