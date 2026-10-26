import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Search from '@mui/icons-material/Search'
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined'
import PersonRow from './PersonRow'
import Spinner from './ui/Spinner'
import { EmptyState, ErrorState } from './ui/States'
import { useSearchUsersQuery } from '../redux/services/user'
import useDebouncedValue from '../lib/useDebouncedValue'
import { count } from '../lib/format'
import '../styles/people.css'

// How you're connected to someone, from the follower IDs that search returns.
export function relationship(person, me) {
  const iFollow = person.followers?.includes(me._id)
  const followsMe = person.followings?.includes(me._id)
  if (iFollow && followsMe) return 'You follow each other'
  if (iFollow) return 'Following'
  if (followsMe) return 'Follows you'
  return person.bio
}

// Search people by username. The Search page keeps the term in the URL (?q=); the aside
// passes `compact`, which shows the first 5 results and a link to the rest.
export default function PeopleSearch({ term, onTermChange, compact = false, autoFocus = false, label = 'Search people', hrefFor }) {
  const me = useSelector((state) => state.auth.user)
  const query = useDebouncedValue(term.trim(), 250)
  // An empty term would return every user, so there's no request until you type.
  const { currentData, isFetching, isError, refetch } = useSearchUsersQuery(query, { skip: !query })
  const results = (currentData ?? []).filter((person) => person._id !== me._id)
  const shown = compact ? results.slice(0, 5) : results
  const inputId = useId()
  const settled = query === term.trim() && !isFetching

  return (
    <div className={['people-search', compact && 'people-search--compact'].filter(Boolean).join(' ')}>
      <div className='people-search__field' role='search'>
        <label htmlFor={inputId} className='visually-hidden'>{label}</label>
        <Search className='people-search__icon' aria-hidden='true' />
        <input
          id={inputId}
          type='search'
          className='people-search__input'
          placeholder={label}
          value={term}
          autoFocus={autoFocus}
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          onChange={(event) => onTermChange(event.target.value)}
        />
        {isFetching && <Spinner size='sm' />}
      </div>

      {/* Announces the number of results once the search settles. */}
      <p className='visually-hidden' role='status'>
        {query && settled && !isError ? `${count(results.length, 'person', 'people')} found` : ''}
      </p>

      {!query && !compact && (
        <EmptyState icon={<PersonSearchOutlined />} title='Find people'>
          Search by username to see someone's profile and follow them.
        </EmptyState>
      )}
      {query && isError && <ErrorState title="Couldn't search" onRetry={refetch} />}
      {query && settled && !isError && results.length === 0 && (
        <p className='people-search__none'>No one matches “{query}”.</p>
      )}
      {shown.length > 0 && (
        <ul className='people-list'>
          {shown.map((person) => (
            <PersonRow key={person._id} person={person} detail={relationship(person, me)} to={hrefFor?.(person)} />
          ))}
        </ul>
      )}
      {compact && !hrefFor && results.length > shown.length && (
        <Link className='people-search__more' to={`/search?q=${encodeURIComponent(query)}`}>
          See all {count(results.length, 'result')}
        </Link>
      )}
    </div>
  )
}
