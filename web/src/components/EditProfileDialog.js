import { useEffect, useRef, useState } from 'react'
import AddAPhotoOutlined from '@mui/icons-material/AddAPhotoOutlined'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import Dialog from './ui/Dialog'
import Button from './ui/Button'
import TextField from './ui/TextField'
import Avatar from './ui/Avatar'
import { useToast } from './ui/Toast'
import { useUpdateMeMutation } from '../redux/services/user'
import { deleteImage, uploadImage } from '../lib/imageStorage'
import '../styles/profile.css'

// The User model intends these limits; the API doesn't enforce them (TESTING.md finding 18).
const USERNAME_MIN = 3
const USERNAME_MAX = 20
const BIO_MAX = 50

// Each picture is kept, removed, or replaced with a new file.
const keep = (picture) => ({ mode: 'keep', current: picture?.url ? picture : null })

function PictureField({ label, picture, onChange, children, disabled }) {
  const fileRef = useRef(null)
  const shown = picture.mode === 'replace' ? picture.preview : picture.mode === 'keep' ? picture.current?.url : null
  return (
    <div className='edit-picture'>
      {children(shown)}
      <div className='edit-picture__buttons'>
        <input
          ref={fileRef}
          type='file'
          accept='image/*'
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file?.type.startsWith('image/')) onChange({ ...picture, mode: 'replace', file, preview: URL.createObjectURL(file) })
          }}
        />
        <Button variant='secondary' size='sm' icon={<AddAPhotoOutlined />} onClick={() => fileRef.current.click()} disabled={disabled}>
          Change {label}
        </Button>
        {shown && (
          <Button variant='ghost' size='sm' icon={<DeleteOutline />} onClick={() => onChange({ ...picture, mode: 'remove' })} disabled={disabled}>
            Remove {label}
          </Button>
        )}
      </div>
    </div>
  )
}

// Edits your username, bio and pictures. It stays open until the save succeeds, and the
// old pictures are deleted from storage only after that.
export default function EditProfileDialog({ open, onClose, user }) {
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState(keep(null))
  const [cover, setCover] = useState(keep(null))
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation()
  const toast = useToast()
  const usernameRef = useRef(null)
  const busy = uploading || saving
  // The latest saved profile, read when the dialog opens. A refresh while it's open
  // (for example after another tab saves) mustn't wipe what you're typing.
  const savedUser = useRef(user)
  savedUser.current = user

  // Start from the saved profile every time the dialog opens.
  useEffect(() => {
    if (!open) return
    const saved = savedUser.current
    setUsername(saved.username)
    setBio(saved.bio || '')
    setAvatar(keep(saved.profilePicture))
    setCover(keep(saved.coverPicture))
    setErrors({})
  }, [open])

  const pictureToSave = async (picture) => {
    if (picture.mode === 'remove') return {}
    if (picture.mode === 'replace') return uploadImage(picture.file)
    return picture.current || {}
  }

  const save = async (event) => {
    event.preventDefault()
    if (busy) return
    const name = username.trim()
    const found = {}
    if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) found.username = `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.`
    if (bio.length > BIO_MAX) found.bio = `Use ${BIO_MAX} characters or fewer.`
    setErrors(found)
    if (found.username) return usernameRef.current.focus()
    if (found.bio) return

    let pictures
    setUploading(true)
    try {
      pictures = await Promise.all([pictureToSave(avatar), pictureToSave(cover)])
    } catch (err) {
      setUploading(false)
      return setErrors({ form: err?.message?.startsWith('Choose') ? err.message : "Couldn't upload the picture. Try again." })
    }
    setUploading(false)
    const [profilePicture, coverPicture] = pictures

    try {
      await updateMe({ id: user._id, username: name, bio: bio.trim(), profilePicture, coverPicture }).unwrap()
    } catch (error) {
      // A taken username comes back as a database error with code 11000.
      if (error?.data?.error?.code === 11000) {
        setErrors({ username: 'That username is taken. Try another one.' })
        return usernameRef.current.focus()
      }
      return setErrors({ form: "Couldn't save your profile. Try again." })
    }

    // Saved: now the replaced or removed pictures can go. Best effort; a failure here
    // only leaves an unused file in storage.
    for (const [picture, saved] of [[avatar, profilePicture], [cover, coverPicture]]) {
      const old = picture.current?.filename
      if (old && saved.filename !== old) deleteImage(old).catch(() => {})
    }
    toast('Profile saved')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title='Edit profile'
      size='lg'
      className='dialog--sheet'
      dismissible={!busy}
      initialFocusRef={usernameRef}
      footer={
        <>
          <Button variant='secondary' onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type='submit' form='edit-profile-form' loading={busy}>{uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <form id='edit-profile-form' className='edit-profile' onSubmit={save} noValidate>
        <PictureField label='cover' picture={cover} onChange={setCover} disabled={busy}>
          {(url) => (
            <div className='edit-picture__cover'>{url && <img src={url} alt='Your cover' />}</div>
          )}
        </PictureField>
        <PictureField label='photo' picture={avatar} onChange={setAvatar} disabled={busy}>
          {(url) => <Avatar src={url} name={username || user.username} size='lg' />}
        </PictureField>
        <TextField
          ref={usernameRef}
          label='Username'
          hint="You'll use this name to sign in."
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          error={errors.username}
          maxLength={USERNAME_MAX}
          autoComplete='username'
          autoCapitalize='none'
          spellCheck={false}
        />
        <TextField
          label='Bio'
          multiline
          rows={2}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          error={errors.bio}
          maxLength={BIO_MAX}
          showCount
        />
        {errors.form && <p className='dialog__error' role='alert'>{errors.form}</p>}
      </form>
    </Dialog>
  )
}
