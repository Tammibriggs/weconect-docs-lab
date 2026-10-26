import '../../styles/ui.css'

// Gray placeholder shapes that hold the layout while content loads.
export function Skeleton({ width = '100%', height = '1em', radius, className }) {
  return (
    <span
      className={['skeleton', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
      aria-hidden='true'
    />
  )
}

// A list of placeholders that screen readers announce once, as `label`.
export function SkeletonList({ label, count = 3, children }) {
  return (
    <div className='skeleton-list' role='status'>
      <span className='visually-hidden'>{label}</span>
      {Array.from({ length: count }, (_, i) => <div key={i}>{children}</div>)}
    </div>
  )
}

export function PostSkeleton() {
  return (
    <div className='card skeleton-post'>
      <div className='skeleton-row'>
        <Skeleton width='40px' height='40px' radius='999px' />
        <div className='skeleton-stack'>
          <Skeleton width='35%' height='14px' />
          <Skeleton width='20%' height='12px' />
        </div>
      </div>
      <Skeleton height='14px' />
      <Skeleton width='70%' height='14px' />
    </div>
  )
}

export function PersonRowSkeleton() {
  return (
    <div className='skeleton-row skeleton-person'>
      <Skeleton width='40px' height='40px' radius='999px' />
      <div className='skeleton-stack'>
        <Skeleton width='40%' height='14px' />
        <Skeleton width='25%' height='12px' />
      </div>
    </div>
  )
}
