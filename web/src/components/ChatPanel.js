import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ArrowBack from '@mui/icons-material/ArrowBack'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline'
import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined'
import Avatar from './ui/Avatar'
import IconButton from './ui/IconButton'
import Spinner from './ui/Spinner'
import { EmptyState } from './ui/States'
import MessageComposer from './MessageComposer'
import { useSocket } from '../realtime/SocketProvider'
import { chatClosed, chatOpened } from '../redux/presenceSlice'
import { useGetUserByIdQuery } from '../redux/services/user'
import {
  useAddMessageMutation,
  useCreateConversationMutation,
  useGetConversationsQuery,
  useGetMessagesQuery,
} from '../redux/services/messaging'
import useDocumentTitle from '../lib/useDocumentTitle'
import useMediaQuery from '../lib/useMediaQuery'
import { formatFull } from '../lib/time'
import '../styles/messages.css'

const OBJECT_ID = /^[a-f\d]{24}$/i
const FIVE_MINUTES = 5 * 60 * 1000
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
const clock = (date) => new Date(date).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })

function dayLabel(date) {
  const day = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(day, new Date())) return 'Today'
  if (sameDay(day, yesterday)) return 'Yesterday'
  const thisYear = day.getFullYear() === new Date().getFullYear()
  return day.toLocaleDateString('en', { month: 'short', day: 'numeric', ...(thisYear ? {} : { year: 'numeric' }) })
}

// Messages from one sender, sent within five minutes of each other on the same day, form a
// group with one timestamp. A new day gets a label.
function groupMessages(messages) {
  const groups = []
  for (const message of messages) {
    const group = groups[groups.length - 1]
    const previous = group?.messages[group.messages.length - 1]
    const continues = group && group.sender === message.sender && sameDay(previous.createdAt, message.createdAt)
      && new Date(message.createdAt) - new Date(previous.createdAt) < FIVE_MINUTES
    if (continues) group.messages.push(message)
    else groups.push({ sender: message.sender, messages: [message], day: !previous || !sameDay(previous.createdAt, message.createdAt) ? dayLabel(message.createdAt) : null })
  }
  return groups
}

// The conversation with one person, at /messages/<their user ID>.
export default function ChatPanel() {
  const { userId } = useParams()
  const me = useSelector((state) => state.auth.user)
  const online = useSelector((state) => state.presence.online.includes(userId))
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const socket = useSocket()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const scrollRef = useRef(null)

  const valid = OBJECT_ID.test(userId) && userId !== me._id
  const { data: other, isError: otherMissing } = useGetUserByIdQuery(userId, { skip: !valid })
  const { data: conversations, isLoading: loadingConversations } = useGetConversationsQuery()
  const conversation = conversations?.find((c) => c.members.includes(userId) && c.members.includes(me._id))
  // v1 can't start a second conversation: creating one returns the one you already have.
  const blocked = Boolean(conversations?.length) && !conversation
  const { data: messages, isLoading: loadingMessages } = useGetMessagesQuery(conversation?._id, { skip: !conversation })
  const [createConversation] = useCreateConversationMutation()
  const [addMessage] = useAddMessageMutation()
  const groups = useMemo(() => groupMessages(messages ?? []), [messages])
  const name = other?.username
  useDocumentTitle(name ? `Chat with ${name}` : 'Messages')

  // While this chat is open, its messages don't count as unread.
  useEffect(() => {
    dispatch(chatOpened(userId))
    return () => dispatch(chatClosed())
  }, [userId, dispatch])

  // Keep the newest message in view.
  useEffect(() => {
    const box = scrollRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [messages?.length])

  const send = async (text) => {
    let target = conversation
    if (!target) {
      target = await createConversation({ senderId: me._id, receiverId: userId }).unwrap()
      if (!target.members.includes(userId)) throw new Error('The API returned a different conversation.')
    }
    // Save first, then tell the other person's browser. If the save fails, nothing is sent.
    await addMessage({ conversationId: target._id, sender: me._id, text }).unwrap()
    socket?.emit('sendMessage', { senderId: me._id, receiverId: userId, text })
  }

  const Heading = desktop ? 'h2' : 'h1'

  if (!valid || otherMissing) {
    return (
      <section className='chat chat--empty'>
        <EmptyState icon={<PersonOffOutlined />} title="This person doesn't exist" headingLevel={desktop ? 2 : 1}>
          Choose someone from your conversations instead.
        </EmptyState>
      </section>
    )
  }

  return (
    <section className='chat' aria-labelledby='chat-title'>
      <header className='chat__header'>
        {!desktop && <IconButton label='Back to messages' icon={<ArrowBack />} onClick={() => navigate('/messages')} />}
        <Link to={`/profile/${userId}`} className='chat__person'>
          <span className='conversation-row__avatar'>
            <Avatar user={other} name={name ?? ''} />
            {online && <span className='presence-dot' aria-hidden='true' />}
          </span>
          <span className='chat__person-text'>
            <Heading id='chat-title' className='chat__title' tabIndex={-1} data-page-heading>{name ?? 'Loading…'}</Heading>
            <span className='chat__status'>{online ? 'Online' : 'View profile'}</span>
          </span>
        </Link>
      </header>

      <div className='chat__scroll' ref={scrollRef}>
        {blocked ? (
          <div className='chat__notice' role='note'>
            <InfoOutlined aria-hidden='true' />
            <p>
              You can only have one conversation for now. weConect's messaging API (v1) can't start a
              second one, so you can't message {name ?? 'this person'} yet.
            </p>
          </div>
        ) : loadingConversations || loadingMessages ? (
          <div className='chat__loading'><Spinner size='lg' label='Loading messages' /></div>
        ) : !groups.length ? (
          <EmptyState icon={<ChatBubbleOutline />} title={`Say hi to ${name ?? 'them'}`} headingLevel={desktop ? 3 : 2}>
            Your messages show up here.
          </EmptyState>
        ) : (
          <ol className='chat__messages' aria-label={`Messages with ${name ?? 'this person'}`} aria-live='polite'>
            {groups.map((group) => {
              const mine = group.sender === me._id
              const last = group.messages[group.messages.length - 1]
              return (
                <li key={group.messages[0]._id} className={['chat__group', mine && 'chat__group--mine'].filter(Boolean).join(' ')}>
                  {group.day && <p className='chat__day'>{group.day}</p>}
                  <span className='visually-hidden'>{mine ? 'You' : name} said:</span>
                  {group.messages.map((message) => (
                    <p key={message._id} className='chat__bubble user-text' dir='auto'>{message.text}</p>
                  ))}
                  <time className='chat__time' dateTime={last.createdAt} title={formatFull(last.createdAt)}>{clock(last.createdAt)}</time>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {!blocked && (
        <MessageComposer
          onSend={send}
          disabled={!other}
          placeholder={name ? `Message ${name}` : 'Write a message'}
        />
      )}
    </section>
  )
}
