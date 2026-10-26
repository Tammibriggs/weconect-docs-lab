import { useSelector } from 'react-redux'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined'
import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined'
import Composer from '../components/Composer'
import PostList from '../components/PostList'
import ProfileHeader from '../components/ProfileHeader'
import PageHeader from '../components/ui/PageHeader'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { buttonClass } from '../components/ui/Button'
import { useGetUserPostsQuery } from '../redux/services/post'
import { useGetUserByIdQuery } from '../redux/services/user'
import useDocumentTitle from '../lib/useDocumentTitle'
import '../styles/profile.css'

const OBJECT_ID = /^[a-f\d]{24}$/i

// Old links used /profile/?id=<userId>. They still work: this sends them to /profile/<userId>.
export function ProfileRedirect() {
  const [searchParams] = useSearchParams()
  const me = useSelector((state) => state.auth.user)
  return <Navigate to={`/profile/${searchParams.get('id') || me._id}`} replace />
}

export default function Profile() {
  const me = useSelector((state) => state.auth.user)
  const { userId } = useParams()
  const isMe = userId === me._id
  // The API answers 500 for an ID that isn't an ObjectId, so don't ask.
  const validId = OBJECT_ID.test(userId)
  const userQuery = useGetUserByIdQuery(userId, { skip: isMe || !validId })
  const posts = useGetUserPostsQuery(userId, { skip: !validId, refetchOnMountOrArgChange: 30 })
  const user = isMe ? me : userQuery.data
  const missing = !validId || userQuery.error?.status === 404 || userQuery.error?.status === 500
  useDocumentTitle(user?.username || (missing ? 'Profile not found' : 'Profile'))

  if (missing) {
    return (
      <div className='profile'>
        <PageHeader title='Profile not found' back={{ fallback: '/' }} />
        <EmptyState icon={<PersonOffOutlined />} title="This account doesn't exist" action={<Link className={buttonClass()} to='/search'>Search people</Link>}>
          The link might be wrong, or the account might have been deleted.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className='profile'>
      <PageHeader title={user?.username || 'Profile'} back={{ fallback: '/' }} />
      {user ? (
        <ProfileHeader user={user} postCount={posts.data?.length} />
      ) : userQuery.isError ? (
        <ErrorState title="Couldn't load this profile" onRetry={userQuery.refetch} />
      ) : (
        <div className='profile-header card' role='status'>
          <span className='visually-hidden'>Loading profile</span>
          <div className='profile-header__cover' />
          <div className='profile-header__info'><Skeleton width='40%' height='20px' /></div>
        </div>
      )}
      {isMe && <Composer />}
      <PostList
        query={posts}
        empty={
          <EmptyState icon={<RateReviewOutlined />} title={isMe ? "You haven't posted yet" : `${user?.username || 'This person'} hasn't posted yet`}>
            {isMe ? 'Share something with the people who follow you.' : 'Their posts will show up here.'}
          </EmptyState>
        }
      />
    </div>
  )
}
