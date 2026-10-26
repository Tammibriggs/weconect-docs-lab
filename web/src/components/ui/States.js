import ErrorOutline from '@mui/icons-material/ErrorOutline'
import Button from './Button'
import '../../styles/ui.css'

// What to show when a list is empty: say what's missing and offer the next step.
export function EmptyState({ icon, title, children, action, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <div className='state'>
      {icon && <span className='state__icon' aria-hidden='true'>{icon}</span>}
      <Heading className='state__title'>{title}</Heading>
      {children && <p className='state__body'>{children}</p>}
      {action && <div className='state__action'>{action}</div>}
    </div>
  )
}

// What to show when something failed to load. Retry calls `onRetry`.
export function ErrorState({ title = "Couldn't load this", message = 'Check your connection and try again.', onRetry, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <div className='state state--error'>
      <span className='state__icon' aria-hidden='true'><ErrorOutline /></span>
      <Heading className='state__title'>{title}</Heading>
      <p className='state__body'>{message}</p>
      {onRetry && <div className='state__action'><Button variant='secondary' onClick={onRetry}>Try again</Button></div>}
    </div>
  )
}
