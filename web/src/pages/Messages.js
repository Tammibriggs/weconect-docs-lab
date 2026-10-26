import { Outlet, useParams } from 'react-router-dom'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import ConversationList from '../components/ConversationList'
import PageHeader from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/States'
import useDocumentTitle from '../lib/useDocumentTitle'
import '../styles/messages.css'

// /messages and /messages/<userId>. From 1024px the list and the chat sit side by side;
// on smaller screens you see the list, then the chat on its own.
export default function Messages() {
  const { userId } = useParams()
  // An open chat sets its own title ("Chat with bob").
  useDocumentTitle(userId ? undefined : 'Messages')

  return (
    <div className={['messages', userId && 'messages--open'].filter(Boolean).join(' ')}>
      <div className='messages__list'>
        <PageHeader title='Messages' />
        <ConversationList activeId={userId} />
      </div>
      <div className='messages__chat'>
        <Outlet />
      </div>
    </div>
  )
}

// What the chat side shows on wide screens before you pick a conversation.
export function ChatPlaceholder() {
  return (
    <section className='chat chat--empty'>
      <EmptyState icon={<ForumOutlined />} title='Your messages'>
        Choose a conversation, or search for someone to message.
      </EmptyState>
    </section>
  )
}
