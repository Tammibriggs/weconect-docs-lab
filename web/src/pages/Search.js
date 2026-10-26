import { useSearchParams } from 'react-router-dom'
import PeopleSearch from '../components/PeopleSearch'
import PageHeader from '../components/ui/PageHeader'
import useDocumentTitle from '../lib/useDocumentTitle'

// /search?q=term. The term lives in the URL, so results survive a reload and can be shared.
export default function Search() {
  useDocumentTitle('Search')
  const [params, setParams] = useSearchParams()
  const term = params.get('q') ?? ''

  return (
    <div className='search-page'>
      <PageHeader title='Search' />
      <div className='search-page__body'>
        <PeopleSearch
          term={term}
          autoFocus
          onTermChange={(value) => setParams(value ? { q: value } : {}, { replace: true })}
        />
      </div>
    </div>
  )
}
