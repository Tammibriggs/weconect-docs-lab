import './App.css';
import { Routes, Route } from "react-router-dom"
import Home from './pages/Home';
import Profile from './pages/Profile';
import { useEffect, useState } from 'react';
import Follow from './pages/Follow';
import Messaging from './pages/Messaging';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import {useSelector} from 'react-redux'
import { Navigate } from "react-router-dom"
import { setCredentials } from './redux/authSlice';
import {useDispatch} from 'react-redux'
import {useGetUserQuery} from './redux/services/user'

function App() {

  const token = useSelector((state) => state.auth.token)
  const [modalOpened, setModalOpened] = useState(false)
  const [windowWidth, setWindowWidth] = useState(0)
  const [skip, setSkip] = useState(true)
  const dispatch = useDispatch()
  const {data} = useGetUserQuery(null, {skip})

  useEffect(() => { 
    if(token){
      setSkip(false)
    }
    if(data) {
      dispatch(setCredentials({user: data.data, token}))
    }
  }, [data, token, dispatch])
  

  const resize = () => {
    setWindowWidth(window.innerWidth);   
  } 

  // set the inner width of the window in state
  useEffect(() => {
    window.addEventListener("resize", resize)
    resize()
    return () => {
     window.removeEventListener("resize", resize)
    }
  }, [])
 
  return (
    <div className="app">
      <Routes>
        <Route path='/' element={token ? <Home setModalOpened={setModalOpened} modalOpened={modalOpened} /> : <Navigate to='/login'/>}/>
        <Route path='/profile' element={token ? <Profile setModalOpened={setModalOpened} modalOpened={modalOpened}/> : <Navigate to='/login'/>}/>
        <Route path='/login' element={token ? <Navigate to='/'/> : <Login/>}/>
        <Route path='/signup' element={token ? <Navigate to='/'/> : <SignUp/>}/>
        {windowWidth < 1024 &&
          <>
            {["/followers", "/following"].map((path, index) => 
              <Route path={path} element={token ? <Follow setModalOpened={setModalOpened} modalOpened={modalOpened} /> : <Navigate to='/login' />} key={index} />
            )}
          </>
        }
        {windowWidth < 850 &&
          <Route path='/messaging' element={token ? <Messaging setModalOpened={setModalOpened} /> : <Navigate to='/login'/>} />
        }
      </Routes> 
    </div>
  );
}

export default App;
