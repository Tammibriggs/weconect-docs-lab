import { useLocation, useNavigate } from 'react-router-dom'
import ArrowBack from '@mui/icons-material/ArrowBack'
import IconButton from './IconButton'
import '../../styles/ui.css'

// The top of every page: its one <h1>, an optional back button, and actions on the right.
// `back` is { fallback: '/path' }: if the person arrived straight from a link, going back
// would leave the app, so the button goes to the fallback page instead.
export default function PageHeader({ title, subtitle, back, actions }) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => {
    if (location.key === 'default') navigate(back.fallback || '/', { replace: true })
    else navigate(-1)
  }

  return (
    <header className='page-header'>
      {back && <IconButton label={back.label || 'Back'} icon={<ArrowBack />} onClick={goBack} />}
      <div className='page-header__titles'>
        <h1 className='page-header__title' tabIndex={-1}>{title}</h1>
        {subtitle && <p className='page-header__subtitle'>{subtitle}</p>}
      </div>
      {actions && <div className='page-header__actions'>{actions}</div>}
    </header>
  )
}
