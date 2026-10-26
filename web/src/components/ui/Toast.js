import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Close from '@mui/icons-material/Close'
import IconButton from './IconButton'
import '../../styles/ui.css'

const ToastContext = createContext(() => {})

// Short messages after an action, such as "Post deleted" or "Couldn't send your message".
// One polite live region announces them; each disappears after 5 seconds.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), [])
  const show = useCallback((message, { tone = 'info', duration = 5000 } = {}) => {
    const id = ++nextId.current
    setToasts((all) => [...all.slice(-2), { id, message, tone }])
    if (duration) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className='toasts' role='status' aria-live='polite'>
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span className='toast__message'>{toast.message}</span>
            <IconButton label='Dismiss' icon={<Close fontSize='small' />} size='sm' onClick={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// const toast = useToast(); toast('Post deleted'); toast("Couldn't delete the post", { tone: 'error' })
export const useToast = () => useContext(ToastContext)
