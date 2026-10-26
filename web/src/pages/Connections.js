import { Link } from 'react-router-dom'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import PageHeader from '../components/ui/PageHeader'
import PersonRow from '../components/PersonRow'
import FollowButton from '../components/FollowButton'
import { PersonRowSkeleton, SkeletonList } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { buttonClass } from '../components/ui/Button'
import { useGetFollowersQuery, useGetFollowingQuery } from '../redux/services/user'
import { formatNumber } from '../lib/format'
import useDocumentTitle from '../lib/useDocumentTitle'
import '../styles/people.css'

const EMPTY = {
  followers: { title: 'No followers yet', body: "When people follow you, they'll show up here." },
  following: { title: "You're not following anyone yet", body: 'Follow people to see their posts on Home.' },
}

// /followers and /following: your two lists. The tab comes from the route, so links and
// the Back button go to the right one.
export default function Connections({ tab }) {
  useDocumentTitle(tab === 'following' ? 'Following' : 'Followers')
  const followers = useGetFollowersQuery()
  const following = useGetFollowingQuery()
  const query = tab === 'following' ? following : followers

  const tabs = [
    { key: 'followers', label: 'Followers', to: '/followers', total: followers.data?.length },
    { key: 'following', label: 'Following', to: '/following', total: following.data?.length },
  ]

  return (
    <div className='connections'>
      <PageHeader title='People' back={{ fallback: '/' }} />
      <nav className='tabs' aria-label='Followers and following'>
        {tabs.map((t) => (
          <Link key={t.key} to={t.to} replace className='tabs__tab' aria-current={t.key === tab ? 'page' : undefined}>
            {t.label}
            {t.total !== undefined && <span className='tabs__count'>{formatNumber(t.total)}</span>}
          </Link>
        ))}
      </nav>

      <div className='connections__list card'>
        {query.isLoading ? (
          <SkeletonList label='Loading people' count={4}><PersonRowSkeleton /></SkeletonList>
        ) : query.isError && !query.data ? (
          <ErrorState title="Couldn't load this list" onRetry={query.refetch} />
        ) : !query.data?.length ? (
          <EmptyState
            icon={<PeopleAltOutlined />}
            title={EMPTY[tab].title}
            action={<Link className={buttonClass({ variant: 'secondary' })} to='/search'>Find people</Link>}
          >
            {EMPTY[tab].body}
          </EmptyState>
        ) : (
          <ul className='people-list'>
            {query.data.map((person) => (
              <PersonRow
                key={person._id}
                person={person}
                detail={tab === 'followers' ? (person.followsBack ? 'You follow each other' : 'Follows you') : null}
                action={
                  <FollowButton
                    userId={person._id}
                    name={person.username}
                    following={tab === 'following' || person.followsBack}
                    label='Follow back'
                  />
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
