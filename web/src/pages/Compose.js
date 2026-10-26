import { useLocation, useNavigate } from 'react-router-dom'
import Composer from '../components/Composer'
import PageHeader from '../components/ui/PageHeader'
import useDocumentTitle from '../lib/useDocumentTitle'

// The Post item in the navigation opens this page. After posting, it goes back to where
// you were, or to Home if you opened it from a link.
export default function Compose() {
  useDocumentTitle('New post')
  const navigate = useNavigate()
  const location = useLocation()
  const done = () => (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1))

  return (
    <div className='compose-page'>
      <PageHeader title='New post' back={{ fallback: '/' }} />
      <Composer autoFocus onPosted={done} />
    </div>
  )
}
