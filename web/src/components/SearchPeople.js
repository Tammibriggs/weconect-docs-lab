import { Person, Search } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import '../styles/searchPerson.css'

export default function SearchPeople({
  userData, 
  setSearchModalOpen = () => {} 
}) {

  const [oldController, setOldController] = useState()
  const [currentController, setCurrentController] = useState(null)
  const [searchResult, setSearchResult] = useState([])
  const navigate = useNavigate();

  useEffect(() => {
    if(currentController) {
      setOldController(currentController)
    }
  }, [currentController])

  const viewProfile = (user) => {
    navigate(`/profile/?id=${user._id}`) 
    setSearchResult([])
    setSearchModalOpen(false)
  }

  // abort old request if it exist and search for users using the enter value in the input field
  const handleSearch = async (e) => {
    const controller = new AbortController()
    if(oldController) {
      oldController.abort()
    }
    setCurrentController(controller)
    if(e.target.value.length !== 0) {
      const res = await axios.get(`${process.env.REACT_APP_SEVER_BASE_URL}users/search?search=${e.target.value}`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
        signal: controller.signal
      })
      if(res.data?.data) setSearchResult(res.data.data)
    }else {
      setSearchResult([])
    }
  }

  return (
    <div className='searchPeople'>
      <div className="noButton__search">
        <Search />
        <input
          placeholder="Search for people"
          onChange={handleSearch}
        />
      </div>
      {!!searchResult.length && 
        <div className='search__results'>
          {searchResult.map((user) => (
            <div className='search__resultsPerson' key={user._id} onClick={() => viewProfile(user)}>
              <img src={user.profilePicture?.url ? user.profilePicture?.url : '/assets/noProfile.jpg'} alt='profile'/>
              <div>
                <span>{user.username}</span>
                {(user.followers.includes(userData.user._id) || user.followings.includes(userData.user._id)) 
                  ? <div>
                      <Person />
                      {!(user.followers.includes(userData.user._id) && user.followings.includes(userData.user._id)) 
                        ? <span className='search__resultsPersonDesc'>
                            {user.followers.includes(userData.user._id) 
                              ? 'Following'
                              : 'Follows you'
                            }
                          </span>
                        : <span className='search__resultsPersonDesc'>You are following each other</span>
                      }
                    </div> 
                  : <span className='search__resultsPersonDesc'>{user.bio}</span>
                }
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
