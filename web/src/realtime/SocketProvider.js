import { createContext, useContext, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { onlineChanged } from '../redux/presenceSlice'
import { receiveMessage } from '../redux/services/messaging'

const SocketContext = createContext(null)

// One Socket.io connection for the whole signed-in session, opened by AppShell.
// It closes when you sign out, because AppShell unmounts then. The Socket.io client loads
// after the first page has rendered, so it isn't part of the first download.
export function SocketProvider({ children }) {
  const me = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    let connection
    let cancelled = false
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return
      connection = io(process.env.REACT_APP_SOCKET_URL)
      // The server keeps its list of online users in memory and loses it whenever it
      // restarts, so register again on every connection, not only the first.
      connection.on('connect', () => connection.emit('addUser', me._id))
      connection.on('getUsers', (users) => dispatch(onlineChanged(users.map((user) => user.userId))))
      connection.on('getMessage', (message) => dispatch(receiveMessage(message)))
      setSocket(connection)
    })
    return () => {
      cancelled = true
      if (connection) {
        connection.off()
        connection.disconnect()
      }
      setSocket(null)
    }
  }, [me._id, dispatch])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

export const useSocket = () => useContext(SocketContext)
