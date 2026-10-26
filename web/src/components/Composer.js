import { useEffect, useId, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined'
import Close from '@mui/icons-material/Close'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import { useToast } from './ui/Toast'
import { useCreatePostMutation } from '../redux/services/post'
import { uploadImage } from '../lib/imageStorage'
import '../styles/composer.css'

// The Post model intends 500 characters; the API doesn't enforce it (TESTING.md finding 18).
const MAX_LENGTH = 500

// Writes a post. Nothing is lost on failure: the text and photo stay until the post is saved,
// and a photo that already uploaded is reused when you try again.
export default function Composer({ autoFocus = false, onPosted }) {
  const me = useSelector((state) => state.auth.user)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null) // { file, preview }
  const [uploaded, setUploaded] = useState(null) // { url, filename } once the photo is stored
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [createPost, { isLoading: saving }] = useCreatePostMutation()
  const toast = useToast()
  const textRef = useRef(null)
  const fileRef = useRef(null)
  const photoButtonRef = useRef(null)
  const labelId = useId()
  const errorId = useId()

  const busy = uploading || saving
  const empty = !text.trim() && !photo

  // Grow the text box with its content.
  useEffect(() => {
    const box = textRef.current
    box.style.height = 'auto'
    box.style.height = `${box.scrollHeight}px`
  }, [text])

  // Release the preview's memory when the photo changes or the composer goes away.
  useEffect(() => () => photo && URL.revokeObjectURL(photo.preview), [photo])

  const choosePhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Choose an image file, such as a JPG or PNG.')
    setError('')
    setUploaded(null)
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  const removePhoto = () => {
    setPhoto(null)
    setUploaded(null)
    photoButtonRef.current?.focus()
  }

  const submit = async (event) => {
    event?.preventDefault()
    if (busy || empty) return
    setError('')

    let img = uploaded
    if (photo && !img) {
      setUploading(true)
      try {
        img = await uploadImage(photo.file)
        setUploaded(img)
      } catch (err) {
        setUploading(false)
        return setError(err?.message?.startsWith('Choose') ? err.message : "Couldn't upload the photo. Try again.")
      }
      setUploading(false)
    }

    try {
      await createPost({ userId: me._id, desc: text.trim(), ...(img ? { img } : {}) }).unwrap()
    } catch {
      return setError("Couldn't share your post. Your text is still here, so try again.")
    }
    setText('')
    setPhoto(null)
    setUploaded(null)
    toast('Your post is live')
    onPosted?.()
  }

  return (
    <form className='composer card' data-focus-ring onSubmit={submit} aria-labelledby={labelId}>
      <Avatar user={me} />
      <div className='composer__body'>
        <label id={labelId} htmlFor={`${labelId}-text`} className='visually-hidden'>Write a post</label>
        <textarea
          id={`${labelId}-text`}
          ref={textRef}
          className='composer__input user-text'
          placeholder={`What's on your mind, ${me.username}?`}
          rows={1}
          dir='auto'
          value={text}
          maxLength={MAX_LENGTH}
          autoFocus={autoFocus}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit(event)
          }}
        />

        {photo && (
          <div className='composer__preview'>
            <img src={photo.preview} alt='Preview of what you chose' />
            <IconButton className='composer__remove' label='Remove photo' icon={<Close />} onClick={removePhoto} disabled={busy} />
          </div>
        )}

        {error && <p id={errorId} className='composer__error' role='alert'>{error}</p>}

        <div className='composer__bar'>
          <input ref={fileRef} type='file' accept='image/*' hidden onChange={choosePhoto} />
          <Button ref={photoButtonRef} variant='ghost' size='sm' icon={<AddPhotoAlternateOutlined />} onClick={() => fileRef.current.click()} disabled={busy}>
            Photo
          </Button>
          <div className='composer__submit'>
            {text.length > MAX_LENGTH - 100 && (
              <span className={['composer__count', text.length >= MAX_LENGTH - 20 && 'composer__count--near'].filter(Boolean).join(' ')}>
                {MAX_LENGTH - text.length}<span className='visually-hidden'> characters left</span>
              </span>
            )}
            <Button type='submit' size='sm' loading={busy} disabled={empty && !busy}>
              {uploading ? 'Uploading…' : saving ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
