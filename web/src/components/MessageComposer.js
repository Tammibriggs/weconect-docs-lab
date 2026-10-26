import { useEffect, useId, useRef, useState } from 'react'
import Send from '@mui/icons-material/Send'
import IconButton from './ui/IconButton'
import '../styles/messages.css'

// The box for writing a message. Enter sends and Shift+Enter starts a new line (except while
// an input method editor is composing text). If sending fails, the text stays.
export default function MessageComposer({ onSend, disabled = false, placeholder = 'Write a message' }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const boxRef = useRef(null)
  const errorId = useId()

  useEffect(() => {
    const box = boxRef.current
    box.style.height = 'auto'
    // scrollHeight doesn't include the border, so add it; scroll only past the maximum height.
    const height = box.scrollHeight + box.offsetHeight - box.clientHeight
    box.style.height = `${Math.min(height, 160)}px`
    box.style.overflowY = height > 160 ? 'auto' : 'hidden'
  }, [text])

  const send = async () => {
    const message = text.trim()
    if (!message || sending || disabled) return
    setSending(true)
    setError('')
    try {
      await onSend(message)
      setText('')
    } catch {
      setError("Couldn't send your message. Try again.")
    } finally {
      setSending(false)
      boxRef.current?.focus()
    }
  }

  return (
    <form className='message-composer' onSubmit={(event) => { event.preventDefault(); send() }}>
      {error && <p id={errorId} className='message-composer__error' role='alert'>{error}</p>}
      <div className='message-composer__row'>
        <label className='visually-hidden' htmlFor={`${errorId}-box`}>Message</label>
        <textarea
          id={`${errorId}-box`}
          ref={boxRef}
          className='message-composer__input user-text'
          rows={1}
          dir='auto'
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <IconButton type='submit' label='Send message' icon={<Send />} variant='brand' disabled={disabled || !text.trim()} aria-disabled={sending || undefined} />
      </div>
    </form>
  )
}
