import { useEffect, useId, useRef, useState } from 'react'
import IconButton from './IconButton'
import '../../styles/ui.css'

// A button that opens a short list of actions, such as "Delete post".
// Keyboard: Enter or Space opens it, arrow keys move, Escape closes and returns focus.
// items: [{ label, icon, onSelect, tone: 'danger' }]
export default function Menu({ label, icon, items }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[role=menuitem]')?.focus()
    const closeOnOutside = (event) => {
      if (!listRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (event) => {
    const options = [...listRef.current.querySelectorAll('[role=menuitem]')]
    const index = options.indexOf(document.activeElement)
    if (event.key === 'Escape') { event.preventDefault(); close() }
    else if (event.key === 'ArrowDown') { event.preventDefault(); options[(index + 1) % options.length].focus() }
    else if (event.key === 'ArrowUp') { event.preventDefault(); options[(index - 1 + options.length) % options.length].focus() }
    else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className='menu'>
      <IconButton
        ref={buttonRef}
        label={label}
        icon={icon}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <ul id={id} ref={listRef} className='menu__list' role='menu' aria-label={label} onKeyDown={onKeyDown}>
          {items.map((item) => (
            <li key={item.label} role='none'>
              <button
                type='button'
                role='menuitem'
                className={['menu__item', item.tone && `menu__item--${item.tone}`].filter(Boolean).join(' ')}
                onClick={() => { close(); item.onSelect() }}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
