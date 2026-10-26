import PostCard from './PostCard'
import { PostSkeleton, SkeletonList } from './ui/Skeleton'
import { ErrorState } from './ui/States'

// A list of posts with its loading, error and empty states. `query` is an RTK Query result,
// such as useGetTimelineQuery(). `empty` is what to show when there are no posts.
export default function PostList({ query, empty }) {
  const { data, isLoading, isError, refetch } = query

  if (isLoading) {
    return (
      <div className='post-list'>
        <SkeletonList label='Loading posts' count={3}><PostSkeleton /></SkeletonList>
      </div>
    )
  }
  if (isError && !data) {
    return <ErrorState title="Couldn't load posts" onRetry={refetch} />
  }
  if (!data?.length) return empty

  return (
    <ul className='post-list'>
      {data.map((post) => (
        <li key={post._id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  )
}
