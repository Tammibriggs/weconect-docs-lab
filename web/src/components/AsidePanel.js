import { useState } from 'react'
import { Link } from 'react-router-dom'
import PeopleSearch from './PeopleSearch'
import PersonRow from './PersonRow'
import FollowButton from './FollowButton'
import ConversationRow from './ConversationRow'
import { useGetFollowersQuery } from '../redux/services/user'
import { useGetConversationsQuery } from '../redux/services/messaging'
import '../styles/people.css'

// The extra column on wide screens (1280px and up): search, people who follow you that you
// don't follow yet, and your latest conversations.
export default function AsidePanel() {
  const [term, setTerm] = useState('')
  const { data: followers } = useGetFollowersQuery()
  const { data: conversations } = useGetConversationsQuery()
  const suggestions = (followers ?? []).filter((person) => !person.followsBack).slice(0, 3)
  const recent = [...(conversations ?? [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3)

  return (
    <aside className='aside' aria-label='Search and suggestions'>
      <section className='aside__section card'>
        <PeopleSearch compact term={term} onTermChange={setTerm} />
      </section>
      {suggestions.length > 0 && (
        <section className='aside__section card' aria-labelledby='follow-back-title'>
          <h2 id='follow-back-title' className='aside__title'>Follow back</h2>
          <ul className='people-list'>
            {suggestions.map((person) => (
              <PersonRow
                key={person._id}
                person={person}
                detail='Follows you'
                action={<FollowButton userId={person._id} name={person.username} following={false} label='Follow back' />}
              />
            ))}
          </ul>
          <Link className='aside__more' to='/followers'>See all followers</Link>
        </section>
      )}
      {recent.length > 0 && (
        <section className='aside__section card' aria-labelledby='recent-messages-title'>
          <h2 id='recent-messages-title' className='aside__title'>Messages</h2>
          <ul className='aside__conversations'>
            {recent.map((conversation) => <ConversationRow key={conversation._id} conversation={conversation} />)}
          </ul>
          <Link className='aside__more' to='/messages'>Open messages</Link>
        </section>
      )}
    </aside>
  )
}
