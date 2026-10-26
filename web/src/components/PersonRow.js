import { Link } from 'react-router-dom'
import Avatar from './ui/Avatar'
import '../styles/people.css'

// One person in a list: picture and name (a link to their profile, or to `to`), a line of detail such as
// "Follows you", and an optional action on the right such as a Follow button.
export default function PersonRow({ person, detail, action, to = `/profile/${person._id}` }) {
  return (
    <li className='person-row'>
      <Link to={to} className='person-row__link'>
        <Avatar user={person} />
        <span className='person-row__text'>
          <span className='person-row__name'>{person.username}</span>
          {detail && <span className='person-row__detail user-text' dir='auto'>{detail}</span>}
        </span>
      </Link>
      {action}
    </li>
  )
}
