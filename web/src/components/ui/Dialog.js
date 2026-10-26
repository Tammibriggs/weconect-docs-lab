import { useEffect, useId, useRef } from 'react'
import Close from '@mui/icons-material/Close'
import IconButton from './IconButton'
import '../../styles/ui.css'

// A modal dialog on the native <dialog> element. The browser moves focus into it, makes the
// page behind it inert, closes it on Escape and puts focus back where it was afterwards.
// `onClose` runs however it closes: Escape, the close button, or a click on the backdrop.
// Errors belong inside the dialog: nothing can appear above a modal dialog, not even a toast.
export default function Dialog({
  open, onClose, title, description, children, footer, size = 'md',
  dismissible = true, initialFocusRef, role, className,
}) {
  const ref = useRef(null)
  const pressedOnBackdrop = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) {
      dialog.showModal()
      document.documentElement.classList.add('has-modal')
      initialFocusRef?.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initialFocusRef])

  // If the dialog unmounts while it's open, release the scroll lock.
  useEffect(() => () => document.documentElement.classList.remove('has-modal'), [])

  return (
    <dialog
      ref={ref}
      className={['dialog', `dialog--${size}`, className].filter(Boolean).join(' ')}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { if (!dismissible) event.preventDefault() }}
      onClose={() => {
        document.documentElement.classList.remove('has-modal')
        if (open) onClose?.()
      }}
      // A backdrop click is one that starts and ends on the <dialog> itself, so dragging
      // to select text out of the dialog doesn't close it.
      onMouseDown={(event) => { pressedOnBackdrop.current = event.target === ref.current }}
      onClick={(event) => {
        if (dismissible && pressedOnBackdrop.current && event.target === ref.current) ref.current.close()
      }}
    >
      {open && (
        <div className='dialog__panel'>
          <header className='dialog__header'>
            <h2 id={titleId} className='dialog__title'>{title}</h2>
            {dismissible && (
              <IconButton label='Close' icon={<Close />} onClick={() => ref.current.close()} />
            )}
          </header>
          {description && <p id={descriptionId} className='dialog__description'>{description}</p>}
          {children && <div className='dialog__body'>{children}</div>}
          {footer && <footer className='dialog__footer'>{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
