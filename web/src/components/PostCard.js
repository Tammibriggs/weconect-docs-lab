import { useId, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Favorite from '@mui/icons-material/Favorite'
import FavoriteBorder from '@mui/icons-material/FavoriteBorder'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined'
import Avatar from './ui/Avatar'
import Menu from './ui/Menu'
import ConfirmDialog from './ui/ConfirmDialog'
import { Skeleton } from './ui/Skeleton'
import { useToast } from './ui/Toast'
import { removePostFromLists, useDeletePostMutation, useToggleLikeMutation } from '../redux/services/post'
import { useGetUserByIdQuery } from '../redux/services/user'
import { deleteImage } from '../lib/imageStorage'
import { formatFull, formatRelative } from '../lib/time'
import { count, formatNumber } from '../lib/format'
import '../styles/postCard.css'

function PostImage({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className='post-card__image post-card__image--missing'>
        <BrokenImageOutlined aria-hidden='true' />
        <span>This photo couldn't load.</span>
      </div>
    )
  }
  return (
    <div className='post-card__image'>
      <img src={src} alt={alt} loading='lazy' decoding='async' onError={() => setFailed(true)} />
    </div>
  )
}

// One post, rendered from a list response (no request of its own). The author's name and
// avatar come from a cached user lookup, one per author, or from the session for your posts.
export default function PostCard({ post }) {
  const me = useSelector((state) => state.auth.user)
  const mine = post.userId === me._id
  const { data: authorData } = useGetUserByIdQuery(post.userId, { skip: mine })
  const author = mine ? me : authorData
  const name = author?.username
  const profile = `/profile/${post.userId}`

  const dispatch = useDispatch()
  const toast = useToast()
  const [toggleLike, likeState] = useToggleLikeMutation()
  const [deletePost] = useDeletePostMutation()
  const [confirming, setConfirming] = useState(false)
  const likesId = useId()

  const liked = post.likes.includes(me._id)
  // A like sent without a userId is stored as null (TESTING.md finding 17); don't count it.
  const likes = post.likes.filter(Boolean).length

  const like = async () => {
    // The API toggles, so a second click while the first is on its way would undo it.
    if (likeState.isLoading) return
    try {
      await toggleLike({ post, userId: me._id }).unwrap()
    } catch {
      toast("Couldn't update the like. Try again.", { tone: 'error' })
    }
  }

  const remove = async () => {
    try {
      await deletePost(post._id).unwrap()
    } catch {
      throw new Error("Couldn't delete the post. Try again.")
    }
    // Remove the card (and its dialog) right away, then move focus to the page heading.
    // While the modal dialog is open the page behind it is inert, so focus has to wait.
    flushSync(() => dispatch(removePostFromLists(post)))
    document.querySelector('main h1')?.focus()
    toast('Post deleted')
    deleteImage(post.img?.filename).catch(() => {})
  }

  return (
    <article className='post-card card' aria-label={name ? `Post by ${name}` : 'Post'}>
      <header className='post-card__header'>
        <Link to={profile} className='post-card__avatar' tabIndex={-1} aria-hidden='true'>
          <Avatar user={author} name={name ?? ''} />
        </Link>
        <div className='post-card__meta'>
          {name
            ? <Link to={profile} className='post-card__author'>{name}</Link>
            : <Skeleton width='7em' height='1em' />}
          <time className='post-card__time' dateTime={post.createdAt} title={formatFull(post.createdAt)}>
            {formatRelative(post.createdAt)}
          </time>
        </div>
        {mine && (
          <Menu
            label='More options'
            icon={<MoreHoriz />}
            items={[{ label: 'Delete post', icon: <DeleteOutline />, tone: 'danger', onSelect: () => setConfirming(true) }]}
          />
        )}
      </header>

      {post.desc && <p className='post-card__text user-text' dir='auto'>{post.desc}</p>}
      {post.img?.url && <PostImage src={post.img.url} alt={name ? `Shared by ${name}` : ''} />}

      <footer className='post-card__actions'>
        <button
          type='button'
          className='like-btn'
          aria-pressed={liked}
          aria-label='Like'
          aria-describedby={likesId}
          aria-disabled={likeState.isLoading || undefined}
          onClick={like}
        >
          {liked ? <Favorite /> : <FavoriteBorder />}
          <span aria-hidden='true'>{formatNumber(likes)}</span>
        </button>
        <span id={likesId} className='visually-hidden'>{count(likes, 'like')}</span>
      </footer>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title='Delete post?'
        message="This can't be undone."
        confirmLabel='Delete'
        onConfirm={remove}
      />
    </article>
  )
}
