import { forwardRef } from 'react'
import '../../styles/ui.css'

// A button that shows only an icon. `label` is required: it's the name screen readers
// announce and the tooltip mouse users see. `pressed` makes it a toggle, such as Like.
const IconButton = forwardRef(function IconButton(
  { label, icon, pressed, variant = 'ghost', size = 'md', className, type = 'button', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={['icon-btn', `icon-btn--${variant}`, `icon-btn--${size}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
})

export default IconButton
