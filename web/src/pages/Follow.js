import { useEffect, useState } from 'react'
import FollowCard from '../components/FollowCard'
import PagesNav from '../components/PagesNav'
import '../styles/follow.css'

export default function Follow({setModalOpened}) {

  const [pathname, setPathname] = useState('')
  
  useEffect(() => {
    window.scrollTo({top: 0})
    const pathname = window.location.pathname
    setPathname(pathname.slice(1, pathname.length))
  }, [])

  return (
    <div className='follow'>
      <PagesNav rotate={true} setModalOpened={setModalOpened}/>
      <FollowCard pathname={pathname}/>
      <PagesNav />
    </div>
  )
}