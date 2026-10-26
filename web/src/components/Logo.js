import '../styles/logo.css'

// The weConect mark: a "w" drawn as one connected line, like people linked together.
// The same shape is in public/favicon.svg and the app icons. `inverse` is for blue backgrounds.
export function LogoMark({ size = 32, inverse = false }) {
  return (
    <svg
      className='logo-mark'
      width={size}
      height={size}
      viewBox='0 0 64 64'
      aria-hidden='true'
      focusable='false'
    >
      <rect width='64' height='64' rx='16' fill={inverse ? '#fff' : '#1371eb'} />
      <path
        d='M15 23l9.5 20L32 28.5 39.5 43 49 23'
        fill='none'
        stroke={inverse ? '#1371eb' : '#fff'}
        strokeWidth='6.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

// The mark plus the wordmark. The wordmark is real text, so it's also the accessible name.
export default function Logo({ size = 32, wordmark = true, inverse = false }) {
  return (
    <span className={['logo-lockup', inverse && 'logo-lockup--inverse'].filter(Boolean).join(' ')}>
      <LogoMark size={size} inverse={inverse} />
      {wordmark
        ? <span className='logo-wordmark'>we<span>Conect</span></span>
        : <span className='visually-hidden'>weConect</span>
      }
    </span>
  )
}
