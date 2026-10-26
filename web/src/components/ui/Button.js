import { forwardRef } from 'react'
import Spinner from './Spinner'
import '../../styles/ui.css'

// The class names for a button's look, so a link can look like a button:
// <Link className={buttonClass({ variant: 'secondary' })}>
export function buttonClass({ variant = 'primary', size = 'md', block = false, className } = {}) {
  return ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ')
}

// Variants: primary, secondary, ghost, danger. While `loading`, the button stays focusable
// (aria-disabled instead of disabled) and ignores clicks.
const Button = forwardRef(function Button(
  { variant, size, block, loading = false, icon, children, className, type = 'button', onClick, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block, className })}
      aria-disabled={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      {...rest}
    >
      {loading ? <Spinner size='sm' /> : icon}
      {children && <span className='btn__label'>{children}</span>}
    </button>
  )
})

export default Button
