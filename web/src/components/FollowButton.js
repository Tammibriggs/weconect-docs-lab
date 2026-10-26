import Button from './ui/Button'
import { useToast } from './ui/Toast'
import { useFollowMutation, useUnfollowMutation } from '../redux/services/user'

// Follow or Unfollow one person. The visible word is the action it takes; the person's name
// is added for screen readers, because a list can have many of these buttons.
// `tone` is the style while you don't follow them: light blue in lists, solid where it's the page's main action.
export default function FollowButton({ userId, name, following, label, size = 'sm', tone = 'tonal' }) {
  const [follow, followState] = useFollowMutation()
  const [unfollow, unfollowState] = useUnfollowMutation()
  const busy = followState.isLoading || unfollowState.isLoading
  const toast = useToast()

  const toggle = async () => {
    try {
      if (following) await unfollow(userId).unwrap()
      else await follow(userId).unwrap()
    } catch (error) {
      // 403 means the app was out of date (already following, or not); the lists refresh anyway.
      if (error?.status !== 403) toast(`Couldn't ${following ? 'unfollow' : 'follow'} ${name}. Try again.`, { tone: 'error' })
    }
  }

  return (
    <Button variant={following ? 'secondary' : tone} size={size} loading={busy} onClick={toggle}>
      {following ? 'Unfollow' : label || 'Follow'}
      <span className='visually-hidden'> {name}</span>
    </Button>
  )
}
