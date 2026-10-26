import { forwardRef, useState } from 'react'
import Visibility from '@mui/icons-material/VisibilityOutlined'
import VisibilityOff from '@mui/icons-material/VisibilityOffOutlined'
import TextField from './TextField'
import IconButton from './IconButton'

// A password field with a toggle that shows what you typed. The toggle's name stays
// "Show password"; aria-pressed tells screen readers whether it's on.
const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      ref={ref}
      type={visible ? 'text' : 'password'}
      {...props}
      end={
        <IconButton
          label='Show password'
          pressed={visible}
          icon={visible ? <VisibilityOff /> : <Visibility />}
          onClick={() => setVisible(!visible)}
        />
      }
    />
  )
})

export default PasswordField
