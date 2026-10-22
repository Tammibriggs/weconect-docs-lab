import {useEffect, useRef, useState } from "react";
import "../styles/message.css";
import { EmailOutlined, Search } from "@mui/icons-material";
import Chat from "./Chat";
import { 
  useCreateConversationMutation, 
  useGetConversationsQuery
} from "../redux/services/messaging";
import axios from "axios";
import { useSelector } from "react-redux";
import { useLazyGetUserByIdQuery } from "../redux/services/user";
import {io} from 'socket.io-client'

export default function Message() { 
  const [search, setSearch] = useState(false);
  const [oldController, setOldController] = useState()
  const [currentController, setCurrentController] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [conversationMembers, setConversationMembers] = useState([])
  const [conversationMember, setConversationMember] = useState({})
  const socket = useRef()
  const [onlineUsers, setOnlineUser] = useState([])

  const userData = useSelector((state) => state.auth)
  const {data: conversations} = useGetConversationsQuery()
  const [createConversation] = useCreateConversationMutation()
  const [getUser] = useLazyGetUserByIdQuery()

  useEffect(() => {
    socket.current = io(process.env.REACT_APP_SOCKET_URL)
  }, [])

  useEffect(() => {
    socket.current?.emit('addUser', userData.user._id)
    socket.current?.on('getUsers', users => {
      setOnlineUser(users)
    })
  }, [userData.user])

  useEffect(() => {
    if(currentController) {
      setOldController(currentController)
    }
  }, [currentController])

  const isOnline = (user) => {
    return onlineUsers.find((onlineUser) => onlineUser.userId === user._id)
  } 
 
  // get user data of the other member of the conversation
  useEffect(() => {
    if(conversations?.data.length) {
      (async () => {
        const conversationMembers = await Promise.all(conversations.data.map(async (conversation) => {
          const friendId = conversation.members.find((id) => id !== userData.user._id)
          const friendData = await getUser({id: friendId})
          if(friendData.error) return null
          let modFriendData = {...friendData.data.data, conversationId:conversation._id}
          return modFriendData
        }))
        if(!conversationMembers.includes(null)) {
          setSearchResults([...conversationMembers])
          setConversationMembers(conversationMembers)
        }
      })()
    }
  }, [conversations, getUser, userData.user._id]) 
 
  // send a new request and abort the previous on if it exists
  // search for user using the search query. Remove current user and users who have existing conversation from the result
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
      if(res.data?.data) {
        const removedCurrentUser = res.data.data.filter((result) => result._id !== userData.user._id) // remove authenticated user from search results
        const filteredConversationMembers = conversationMembers
        .filter((member) => member.username.trim().toLowerCase().includes(e.target.value.trim().toLowerCase())) // filter members using search value

        if(conversationMembers.length) {
          const removeDuplicates = removedCurrentUser.filter((user) => {
            const d = filteredConversationMembers.filter((member) => member._id === user._id)
            if(d.length) return false
            else return true
          })
          return setSearchResults([...filteredConversationMembers, ...removeDuplicates])
        }
        setSearchResults(removedCurrentUser)
      }
    }else {
      setSearchResults([...conversationMembers])
    }
  }

  const startConversation = async (user) => {
    if(user.conversationId) {
      setConversationMember(user)
    }else{
      const conversationRes = await createConversation({senderId: userData.user._id, receiverId: user._id})
      if(conversationRes?.error) return null
      setConversationMember({...user, conversationId: conversationRes.data.data._id})
    }
  }

  return (
    <div className="message__cont">
      <div className="message">
        {!search && !conversations?.data.length && (
          <div className="message__noMessage">
            <h3>Messages</h3>
            <img src="/assets/taking.jpg" alt="taliking" />
            <button className="button" onClick={() => setSearch(true)}>
              Start a Conversation
            </button>
          </div>
        )}
        {(search || !!conversations?.data.length) && !Object.keys(conversationMember).length && (
          <div>
            <div className="message__searchContainer">
              <div className="noButton__search">
                <Search />
                <input
                  placeholder="Find a chat pal"
                  onChange={handleSearch}
                />
              </div>
            </div>
            {searchResults.map((user) => {
              return (
                <div className="message__searchPal" onClick={() => startConversation(user)} key={user._id}>
                  {isOnline(user) &&
                    <span className="message__searchPalOnline"></span>
                  }
                  <div>
                    <img
                      src={user.profilePicture?.url ? user.profilePicture?.url : `/assets/noProfile.jpg`}
                      alt="profile"
                      className="message__searchPalImage"
                    />
                    <div className='message__searchPalInfo'>
                      <span>{user.username}</span>
                      {user.bio && <span>{user.bio}</span>}
                    </div>
                  </div>
                  <span>
                    <EmailOutlined />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!!Object.keys(conversationMember).length && (
          <Chat 
            setConversationMember={setConversationMember} 
            conversationMember={conversationMember}
            currentUser={userData.user}
            socket={socket}
          />
        )}
      </div>
    </div>
  );
}
