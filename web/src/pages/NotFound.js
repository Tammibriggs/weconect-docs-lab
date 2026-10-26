import { Link } from 'react-router-dom'
import SearchOff from '@mui/icons-material/SearchOff'
import PageHeader from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/States'
import { buttonClass } from '../components/ui/Button'
import useDocumentTitle from '../lib/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')

  return (
    <div>
      <PageHeader title='Page not found' />
      <EmptyState
        icon={<SearchOff />}
        title="We can't find that page"
        action={<Link className={buttonClass()} to='/'>Go to Home</Link>}
      >
        The link might be broken, or the page might have been removed.
      </EmptyState>
    </div>
  )
}
