import { useEffect } from 'react'
import '../styles/modal.css'

function Modal({open, modalLable, children, onClose, custom_modal}) {

  useEffect(() => {
    document.body.classList.toggle('noscroll', open)
  }, [open])

  const handleClose = (e) => {
    if(e.target.className === 'modalContainer'){
      onClose()
    }else if(e.target.className?.split(' ')[0] === 'modalContainer') {
      onClose()
    }
    return null
  }
 
  if(open) {
    return (
      <div className={`modalContainer ${custom_modal}`} onClick={handleClose}>
        <div className= 'modal'>
          <div className='modal__head'>
            <h2>{modalLable}</h2>
            <span className='modal__close' onClick={onClose}>x</span>
          </div>
          {children}
        </div>
      </div>
    )
  }
  return null
}

export default Modal