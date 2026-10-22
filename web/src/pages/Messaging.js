import Message from '../components/Message'
import PagesNav from '../components/PagesNav'
import '../styles/messaging.css'

export default function Messaging({setModalOpened}) {

  return (
    <div className='messaging'>
      <PagesNav rotate={true} setModalOpened={setModalOpened} />
      <Message />
    </div>
  )
}
