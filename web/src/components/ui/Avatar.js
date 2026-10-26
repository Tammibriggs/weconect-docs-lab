import { useEffect, useState } from 'react'
import '../../styles/ui.css'

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 112 }
const TONES = 5

// The same name always gets the same tint.
function toneFor(name) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) >>> 0
  return hash % TONES
}

// A person's picture, or their initial on a tinted circle when they have none or it fails
// to load. It's decorative: the person's name is always shown or announced next to it.
export default function Avatar({ user, src, name, size = 'md', className }) {
  const url = src ?? user?.profilePicture?.url
  const label = name ?? user?.username ?? ''
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  const px = SIZES[size] ?? size

  return (
    <span
      className={['avatar', className].filter(Boolean).join(' ')}
      style={{ '--avatar-size': `${px}px` }}
      aria-hidden='true'
    >
      {url && !failed
        ? <img src={url} alt='' width={px} height={px} loading='lazy' decoding='async' onError={() => setFailed(true)} />
        : <span className='avatar__initial' data-tone={toneFor(label)}>{Array.from(label.trim())[0]?.toUpperCase() || '?'}</span>
      }
    </span>
  )
}
