import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import Button, { buttonClass } from '../components/ui/Button'
import useDocumentTitle from '../lib/useDocumentTitle'
import '../styles/boot.css'

// Shown instead of a blank page when a page crashes while rendering.
export default function RouteError() {
  useDocumentTitle('Something went wrong')
  const error = useRouteError()
  useEffect(() => console.error(error), [error])

  return (
    <main className='boot'>
      <LogoMark size={56} />
      <div className='boot__error' role='alert'>
        <h1>Something went wrong</h1>
        <p>Reload the page to try again.</p>
        <div className='boot__actions'>
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <a className={buttonClass({ variant: 'secondary' })} href='/'>Go to Home</a>
        </div>
      </div>
    </main>
  )
}
