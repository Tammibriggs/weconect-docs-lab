import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import Composer from '../components/Composer'
import PostList from '../components/PostList'
import PageHeader from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/States'
import { buttonClass } from '../components/ui/Button'
import { useGetTimelineQuery } from '../redux/services/post'
import useDocumentTitle from '../lib/useDocumentTitle'
import { greeting } from '../lib/time'
import '../styles/home.css'

export default function Home() {
  useDocumentTitle('Home')
  const me = useSelector((state) => state.auth.user)
  // Refetch when you come back to Home after 30 seconds or more.
  const timeline = useGetTimelineQuery(undefined, { refetchOnMountOrArgChange: 30 })

  return (
    <div className='home'>
      <PageHeader title='Home' subtitle={`${greeting()}, ${me.username}`} />
      <Composer />
      <PostList
        query={timeline}
        empty={
          <EmptyState
            icon={<PeopleAltOutlined />}
            title='Your feed is empty'
            action={<Link className={buttonClass()} to='/search'>Find people to follow</Link>}
          >
            Posts from you and the people you follow show up here.
          </EmptyState>
        }
      />
    </div>
  )
}
