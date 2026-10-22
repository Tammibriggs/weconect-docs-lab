import '../styles/pagesNav.css'
import {
  EmailOutlined, 
  PermIdentityOutlined, 
  OtherHousesOutlined,
  PeopleAltOutlined,
  OtherHouses,
  Email,
  Add,
  PeopleAlt,
  Person,
  Search
} from '@mui/icons-material';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useSelector } from 'react-redux';
import SearchPeople from './SearchPeople';

function PagesNav({rotate=false, setModalOpened}) {

  const userData = useSelector((state) => state.auth)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [locationChanged, setLocationChanged] = useState(false)
  const [pathname, setPathname] = useState(null)
  const [searchParams] = useSearchParams()
 
  // get the URL pathname and set in the state
  useEffect(() => {
    if(locationChanged || true) {
      const pathname = window.location.pathname
      if(searchParams.get('id') && searchParams.get('id') === userData.user._id){
        setPathname(pathname.slice(1, pathname.length).split('/')[0])
      }
      else setPathname(pathname.slice(1, pathname.length))
    }
  }, [locationChanged, searchParams, userData.user._id])

  // // remove bottom page nav when a the windows height becomes smaller particularly when a virtual keyboard is displayed
  // useEffect(() => {
  //   const pageNav = document.querySelector(".pageNavAlt")
  //   const initialWindowHeight = window.innerHeight
  //   if(pathname !== 'login' && pathname !== 'signup' && pathname !== 'messaging' && pathname !== null) {
  //     if('visualViewport' in window) {
  //       window.visualViewport.addEventListener('resize', function() {
  //         if(window.innerHeight + 50 < initialWindowHeight) {
  //           pageNav.style.display = 'none'
  //         } else if (pathname !== 'login' && pathname !== 'signup' ) {
  //           pageNav.style.display = 'block'
  //         }
  //       })
  //     }
  //   }
  // }, [pathname])

  return (
    <div className={`pagesNav ${rotate ? 'pagesNavVertical' : 'pageNavAlt'}`} id='pageNav'>
      <div className='pagesNav__container'>
        <Link 
          to='/' 
          className='pagesNav__action' 
          onClick={() => setLocationChanged(!locationChanged)}
        >
          {pathname === ''
            ? <OtherHouses />
            : <OtherHousesOutlined />
          }
        </Link>
        <Link 
          to='/messaging' 
          className='pagesNav__action remove' 
          onClick={() => setLocationChanged(!locationChanged)}
        >
          {pathname === 'messaging'
            ? <Email />
            : <EmailOutlined />
          }
        </Link>
        <Link 
          to='/followers' 
          className='pagesNav__action pageNav__follow'  
          onClick={() => setLocationChanged(!locationChanged)}
        >
          {pathname === 'followers'
            ? <PeopleAlt />
            : <PeopleAltOutlined />
          }
        </Link>
        <div 
          className='pagesNav__action'  
          onClick={() => setSearchModalOpen(!searchModalOpen)}
        >
         <Search />
        </div>
        <Link 
          to={`/profile/?id=${userData.user._id}`}
          className='pagesNav__action' 
          onClick={() => setLocationChanged(!locationChanged)}
        >
          {pathname === 'profile'
            ? <Person />
            : <PermIdentityOutlined />
          }
        </Link>
        {rotate && (pathname?.length === 0 || pathname === 'profile') &&
          <Link className='pagesNav__action addPost' onClick={() => setModalOpened(true)}>
            <Add />
          </Link>
        }
      </div>
      <Modal
        open={searchModalOpen}
        onClose ={() => {setSearchModalOpen(false)}}
        custom_modal='search_modal'
      >
        <SearchPeople 
          userData={userData} 
          setSearchModalOpen={setSearchModalOpen}
        />
      </Modal>
    </div>
  )
}

export default PagesNav