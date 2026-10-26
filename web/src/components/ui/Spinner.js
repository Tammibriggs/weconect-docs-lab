import '../../styles/ui.css'

// A loading indicator. With a `label`, screen readers announce it.
export default function Spinner({ size = 'md', label }) {
  return (
    <span className={`spinner spinner--${size}`} role={label ? 'status' : undefined}>
      <span className='spinner__circle' aria-hidden='true' />
      {label && <span className='visually-hidden'>{label}</span>}
    </span>
  )
}
