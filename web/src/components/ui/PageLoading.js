import Spinner from './Spinner'
import '../../styles/ui.css'

// Shown while the code for a page downloads (pages loaded with React.lazy).
export default function PageLoading() {
  return (
    <div className='page-loading'>
      <Spinner size='lg' label='Loading' />
    </div>
  )
}
