import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import Feed from '../components/Feed'
import FollowCard from '../components/FollowCard'
import PagesNav from '../components/PagesNav'
import ProfileCard from '../components/ProfileCard'
import RightSide from '../components/RightSide'
import Share from '../components/Share'
import ShareModal from '../components/ShareModal'
import { useGetPostsQuery } from '../redux/services/post'
import { useGetUserByIdQuery } from '../redux/services/user'
import '../styles/profile.css'

export default function Profile({setModalOpened, modalOpened}) {

  const user = useSelector((state) => state.auth.user)
  const [searchParams] = useSearchParams();
  const [skip, setSkip] = useState(true)
  const {data: userData} = useGetUserByIdQuery({id: searchParams.get('id')}, {skip})
  const {data:postsData} = useGetPostsQuery({userId: searchParams.get('id')}, {skip})

  useEffect(() => {
    window.scrollTo({top: 0})
  }, [])

  useEffect(() => {
    if(searchParams.get('id')) {
      setSkip(false)
    }
  }, [searchParams])

  return (
    <div className='profile'>
      <PagesNav rotate={true} setModalOpened={setModalOpened} />
      <div className='profile__left'>
        <Link to='/' className='logo'><h1>weConect</h1></Link>
        <FollowCard />
      </div>
      <div>
        <ProfileCard
          name={userData?.data ? userData.data.username : ''}
          coverImage={userData?.data.coverPicture}
          profileImage={userData?.data.profilePicture}
          bio={userData?.data.bio}
          followers={userData?.data.followers.length}
          following={userData?.data.followings.length}
          userId={searchParams.get('id')}
          showProfileBtn={searchParams.get('id') ? searchParams.get('id') === user._id : false}
        />
        {searchParams.get('id') === user._id &&
          <Share />
        }
        <Feed postsData={postsData}/>
      </div>
      <RightSide setModalOpened={setModalOpened} />
      <ShareModal modalOpened={modalOpened} setModalOpened={setModalOpened} /> 
      <PagesNav />
    </div>
  )
}
