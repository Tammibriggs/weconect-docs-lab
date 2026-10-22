import '../styles/chat.css'
import SendIcon from '@mui/icons-material/Send';
import { KeyboardArrowLeft } from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { useAddMessageMutation, useLazyGetMessagesQuery } from '../redux/services/messaging';

export default function Chat({currentUser, conversationMember, setConversationMember, socket}) {

  const inputRef = useRef()
  const scrollRef = useRef()

  const [addMessage] = useAddMessageMutation()
  const [getMessages] = useLazyGetMessagesQuery()
  const [messages, setMessages] = useState([])

  useEffect(() => {
    (async () => {
      const res = await getMessages({conversationId: conversationMember.conversationId})
      if(res?.data?.data) setMessages(res.data.data)
    })()
  }, [conversationMember.conversationId, getMessages])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start' })
  }, [messages])

  useEffect(() => {
    socket.current.on('getMessage', data => {
      if(data.senderId === conversationMember._id) setMessages([...messages, {sender: data.senderId, text: data.text}])
    })
  }, [messages, conversationMember._id, socket]) 

  const handleSubmit = async (e) => {
    e.preventDefault()
    if(inputRef.current.innerText) { 

      socket.current.emit('sendMessage', {
        senderId: currentUser._id,
        receiverId: conversationMember._id,
        text: inputRef.current.innerText
      })

      const message = await addMessage({
        conversationId: conversationMember.conversationId,
        sender: currentUser._id,
        text: inputRef.current.innerText
      })
      if(message?.data?.data) {
        setMessages([...messages, message.data.data])
      }
      inputRef.current.innerText = ''
    }
    return
  }

  const messangerName = (senderId) => {
    if(senderId === currentUser._id) {
      return 'You'
    }else {
      return conversationMember.username
    }
  }

  return (
    <div className='chat'>
      <div className='chat__head'>
        <span onClick={() => setConversationMember({})}>
          <KeyboardArrowLeft />
        </span>
        <img src={
            conversationMember.profilePicture?.url 
            ? conversationMember.profilePicture?.url 
            : '/assets/noProfile.jpg'
          } 
          alt="profile" 
          className='chat__searchPalImage' />
        <span>{conversationMember.username}</span>
      </div>
      <div className='chat__chats'>
        {messages.map((message) => 
          <span 
            ref={scrollRef} 
            className={`${message.sender === currentUser._id ? 'chat__myMessage' : ''}`}
          >
            <span>{messangerName(message.sender)}</span>
            <span>{message.text}</span>
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <span className="textarea" role="textbox" 
          contentEditable='true'
          ref={inputRef}
        >
        </span>
        <button>
          <SendIcon />
        </button>
      </form>
    </div>
  )
}
