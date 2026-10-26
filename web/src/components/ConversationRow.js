import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Avatar from './ui/Avatar'
import { useGetUserByIdQuery } from '../redux/services/user'
import '../styles/messages.css'

// One conversation in a list: the other person, whether they're online, and unread messages.
export default function ConversationRow({ conversation, active = false }) {
  const me = useSelector((state) => state.auth.user)
  const otherId = conversation.members.find((id) => id !== me._id) ?? me._id
  const { data: other } = useGetUserByIdQuery(otherId)
  const online = useSelector((state) => state.presence.online.includes(otherId))
  const unread = useSelector((state) => state.presence.unread[otherId] || 0)

  return (
    <li>
      <Link to={`/messages/${otherId}`} className='conversation-row' aria-current={active ? 'page' : undefined}>
        <span className='conversation-row__avatar'>
          <Avatar user={other} name={other?.username ?? ''} />
          {online && <span className='presence-dot' aria-hidden='true' />}
        </span>
        <span className='conversation-row__text'>
          <span className='conversation-row__name'>{other?.username ?? 'Loading…'}</span>
          <span className='conversation-row__detail'>{online ? 'Online' : other?.bio || 'Open the conversation'}</span>
        </span>
        {unread > 0 && (
          <span className='badge'>
            {unread}
            <span className='visually-hidden'> unread</span>
          </span>
        )}
      </Link>
    </li>
  )
}
