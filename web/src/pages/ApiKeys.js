import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import ContentCopy from '@mui/icons-material/ContentCopy'
import Check from '@mui/icons-material/Check'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useCreateApiKeyMutation, useDeleteApiKeyMutation, useGetApiKeysQuery } from '../redux/services/apiKeys'
import { formatFull, formatRelative } from '../lib/time'
import useDocumentTitle from '../lib/useDocumentTitle'
import '../styles/apiKeys.css'

// What a key can do. The API also accepts a write-only key; the page offers the two
// combinations people need.
const ACCESS = [
  { value: 'read', scopes: ['read'], label: 'Read only', hint: 'Read profiles, posts and your timeline.' },
  { value: 'readWrite', scopes: ['read', 'write'], label: 'Read and write', hint: 'Also follow people, publish and delete posts, and like posts.' },
]

function accessLabel(scopes) {
  if (scopes.includes('read') && scopes.includes('write')) return 'Read and write'
  return scopes.includes('write') ? 'Write only' : 'Read only'
}

// /settings/api-keys: create API keys for your own code, see them, and delete them.
export default function ApiKeys() {
  useDocumentTitle('API keys')
  const me = useSelector((state) => state.auth.user)
  const keys = useGetApiKeysQuery()
  const [newKey, setNewKey] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteApiKey] = useDeleteApiKeyMutation()
  const toast = useToast()

  const confirmDelete = async () => {
    try {
      await deleteApiKey(deleting.id).unwrap()
    } catch {
      throw new Error("Couldn't delete the key. Try again.")
    }
    toast(`Deleted “${deleting.name}”`)
    setDeleting(null)
  }

  return (
    <div className='api-keys'>
      <PageHeader title='API keys' back={{ fallback: `/profile/${me._id}` }} />
      <p className='api-keys__intro'>
        An API key lets your own code use weConect as you, through the weConect API.
        Anyone with a key can act as you, so keep your keys secret.
      </p>

      {newKey
        ? <NewKey apiKey={newKey} onDone={() => setNewKey(null)} />
        : <CreateKeyForm onCreated={setNewKey} />}

      <section className='api-keys__section' aria-labelledby='your-keys'>
        <h2 id='your-keys' className='api-keys__heading'>Your keys</h2>
        <div className='card api-keys__list'>
          {keys.isLoading ? (
            <SkeletonList label='Loading your keys' count={2}>
              <div className='api-key'><Skeleton width='40%' height='14px' /><Skeleton width='70%' height='12px' /></div>
            </SkeletonList>
          ) : keys.isError && !keys.data ? (
            <ErrorState title="Couldn't load your keys" onRetry={keys.refetch} headingLevel={3} />
          ) : !keys.data.length ? (
            <EmptyState icon={<KeyOutlined />} title='No API keys yet' headingLevel={3}>
              Keys you create show up here.
            </EmptyState>
          ) : (
            <ul className='api-keys__items'>
              {keys.data.map((key) => (
                <li key={key.id} className='api-key'>
                  <div className='api-key__text'>
                    <span className='api-key__name user-text'>{key.name}</span>
                    <span className='api-key__detail'>
                      <code className='api-key__hint'>wck_…{key.lastFour}</code>
                      <span>{accessLabel(key.scopes)}</span>
                      <span>Created <time dateTime={key.createdAt} title={formatFull(key.createdAt)}>{formatRelative(key.createdAt)}</time></span>
                      <span>
                        {key.lastUsedAt
                          ? <>Last used <time dateTime={key.lastUsedAt} title={formatFull(key.lastUsedAt)}>{formatRelative(key.lastUsedAt)}</time></>
                          : 'Never used'}
                      </span>
                    </span>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    icon={<DeleteOutline />}
                    aria-label={`Delete key “${key.name}”`}
                    onClick={() => setDeleting(key)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title='Delete this key?'
        message={deleting ? `Code that uses “${deleting.name}” stops working immediately. You can't undo this.` : ''}
        confirmLabel='Delete key'
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function CreateKeyForm({ onCreated }) {
  const [name, setName] = useState('')
  const [access, setAccess] = useState('read')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [createApiKey, { isLoading }] = useCreateApiKeyMutation()
  const nameRef = useRef(null)

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setError('Enter a name for the key.')
      nameRef.current?.focus()
      return
    }
    setError('')
    try {
      const created = await createApiKey({ name: name.trim(), scopes: ACCESS.find((a) => a.value === access).scopes }).unwrap()
      onCreated(created)
    } catch (err) {
      setFormError(err?.status === 400 && err.data?.message ? err.data.message : "Couldn't create the key. Try again.")
    }
  }

  return (
    <section className='api-keys__section' aria-labelledby='create-key'>
      <h2 id='create-key' className='api-keys__heading'>Create a key</h2>
      <form className='card api-keys__form' onSubmit={submit} noValidate>
        <TextField
          ref={nameRef}
          label='Name'
          hint='Something to recognize it by, such as the app or script that uses it.'
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          showCount
          error={error}
          autoComplete='off'
        />
        <fieldset className='api-keys__access'>
          <legend className='field__label'>Access</legend>
          {ACCESS.map((option) => (
            <label key={option.value} className='api-keys__option'>
              <input
                type='radio'
                name='access'
                value={option.value}
                checked={access === option.value}
                onChange={() => setAccess(option.value)}
              />
              <span>
                <span className='api-keys__option-label'>{option.label}</span>
                <span className='api-keys__option-hint'>{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {formError && <p className='api-keys__form-error' role='alert'>{formError}</p>}
        <div>
          <Button type='submit' loading={isLoading} icon={<KeyOutlined />}>Create key</Button>
        </div>
      </form>
    </section>
  )
}

// Shown once, right after a key is created: the only time the key itself is available.
function NewKey({ apiKey, onDone }) {
  const headingRef = useRef(null)
  const inputRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { headingRef.current?.focus() }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.key)
      setCopied(true)
    } catch {
      // Without clipboard access, select the key so it can be copied by hand.
      inputRef.current?.select()
    }
  }

  return (
    <section className='api-keys__section' aria-labelledby='new-key'>
      <div className='card api-keys__new'>
        <h2 id='new-key' className='api-keys__heading' tabIndex={-1} ref={headingRef}>Copy your new key</h2>
        <p>
          This is the only time “{apiKey.name}” is shown in full. Store it somewhere safe, such as a
          password manager.
        </p>
        <div className='api-keys__secret'>
          <label htmlFor='new-key-value' className='visually-hidden'>API key</label>
          <input
            id='new-key-value'
            ref={inputRef}
            className='field__input api-keys__secret-value'
            value={apiKey.key}
            readOnly
            spellCheck={false}
            onFocus={(e) => e.target.select()}
          />
          <Button variant='secondary' icon={copied ? <Check /> : <ContentCopy />} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className='api-keys__usage'>
          Send it in the <code>Authorization</code> header: <code>Bearer wck_…</code>
        </p>
        <div>
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    </section>
  )
}
