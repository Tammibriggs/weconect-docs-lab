import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import Logout from '@mui/icons-material/Logout'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import Avatar from './ui/Avatar'
import Button, { buttonClass } from './ui/Button'
import FollowButton from './FollowButton'
import { signOut } from '../redux/services/api'
import { formatJoined } from '../lib/time'
import { count } from '../lib/format'
import '../styles/profile.css'

// Downloads the first time you open it.
const EditProfileDialog = lazy(() => import('./EditProfileDialog'))

// The top of a profile: cover, picture, name, bio, counts and the main action.
// The follower lists are only available for your own account, so only your counts are links.
export default function ProfileHeader({ user, postCount }) {
  const me = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const [editing, setEditing] = useState(false)
  // Stays mounted after the first open, so closing it returns focus the native way.
  const [editorLoaded, setEditorLoaded] = useState(false)
  const isMe = user._id === me._id
  const cover = user.coverPicture?.url

  const stats = [
    { label: count(postCount ?? 0, 'post'), to: null },
    { label: count(user.followers.length, 'follower'), to: isMe ? '/followers' : null },
    { label: `${user.followings.length} following`, to: isMe ? '/following' : null },
  ]

  return (
    <section className='profile-header card' aria-label='Profile'>
      <div className='profile-header__cover'>
        {cover && <img src={cover} alt='' />}
      </div>
      <div className='profile-header__top'>
        <div className='profile-header__avatar'>
          <Avatar user={user} size='xl' />
        </div>
        <div className='profile-header__actions'>
          {isMe ? (
            <>
              <Button variant='secondary' size='sm' onClick={() => { setEditorLoaded(true); setEditing(true) }}>Edit profile</Button>
              <Button variant='ghost' size='sm' icon={<Logout />} onClick={() => dispatch(signOut('signedOut'))}>Sign out</Button>
            </>
          ) : (
            <>
              <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to={`/messages/${user._id}`}>Message</Link>
              <FollowButton userId={user._id} name={user.username} following={user.followers.includes(me._id)} tone='primary' />
            </>
          )}
        </div>
      </div>
      <div className='profile-header__info'>
        <p className='profile-header__name user-text'>{user.username}</p>
        {user.bio && <p className='profile-header__bio user-text' dir='auto'>{user.bio}</p>}
        <p className='profile-header__joined'>
          <CalendarMonthOutlined fontSize='small' aria-hidden='true' />
          {formatJoined(user.createdAt)}
        </p>
        <ul className='profile-header__stats'>
          {stats.map((stat) => (
            <li key={stat.label}>{stat.to ? <Link to={stat.to}>{stat.label}</Link> : stat.label}</li>
          ))}
        </ul>
        {/* Here rather than with the buttons above, which have no room for a third on phones. */}
        {isMe && (
          <Link className='profile-header__api-keys' to='/settings/api-keys'>
            <KeyOutlined fontSize='small' aria-hidden='true' />
            API keys
          </Link>
        )}
      </div>
      {isMe && editorLoaded && (
        <Suspense fallback={null}>
          <EditProfileDialog open={editing} onClose={() => setEditing(false)} user={user} />
        </Suspense>
      )}
    </section>
  )
}
