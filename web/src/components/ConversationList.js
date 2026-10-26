import { useState } from 'react'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import ConversationRow from './ConversationRow'
import PeopleSearch from './PeopleSearch'
import { PersonRowSkeleton, SkeletonList } from './ui/Skeleton'
import { EmptyState, ErrorState } from './ui/States'
import { useGetConversationsQuery } from '../redux/services/messaging'
import '../styles/messages.css'

// Your conversations, and a search to start a new one.
export default function ConversationList({ activeId }) {
  const [term, setTerm] = useState('')
  const { data: conversations, isLoading, isError, refetch } = useGetConversationsQuery()

  return (
    <div className='conversation-list'>
      <div className='conversation-list__search'>
        <PeopleSearch compact term={term} onTermChange={setTerm} label='Search people to message' hrefFor={(person) => `/messages/${person._id}`} />
      </div>
      {!term && (
        isLoading ? (
          <SkeletonList label='Loading conversations' count={3}><PersonRowSkeleton /></SkeletonList>
        ) : isError ? (
          <ErrorState title="Couldn't load your conversations" onRetry={refetch} />
        ) : conversations?.length ? (
          <ul className='conversation-list__items' aria-label='Conversations'>
            {conversations.map((conversation) => (
              <ConversationRow key={conversation._id} conversation={conversation} active={conversation.members.includes(activeId)} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<ForumOutlined />} title='No messages yet'>
            Search for someone above to start a conversation.
          </EmptyState>
        )
      )}
    </div>
  )
}
