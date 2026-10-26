import { useRef, useState } from 'react'
import Dialog from './Dialog'
import Button from './Button'

// Asks before a destructive action, such as "Delete post?". Focus starts on Cancel, so
// pressing Enter by accident doesn't confirm. If `onConfirm` throws, its message shows here.
export default function ConfirmDialog({ open, onClose, title, message, confirmLabel, onConfirm, tone = 'danger' }) {
  const cancelRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => { setError(''); onClose() }}
      title={title}
      description={message}
      size='sm'
      role='alertdialog'
      initialFocusRef={cancelRef}
      dismissible={!busy}
      footer={
        <>
          <Button ref={cancelRef} variant='secondary' onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={tone} loading={busy} onClick={confirm}>{confirmLabel}</Button>
        </>
      }
    >
      {error && <p className='dialog__error' role='alert'>{error}</p>}
    </Dialog>
  )
}
