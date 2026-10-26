import { forwardRef, useId } from 'react'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import '../../styles/ui.css'

// A labeled text input, or a text area with `multiline`. The hint, error and character
// count are linked to the field with aria-describedby, so screen readers read them too.
// `end` is an element shown inside the field's right edge, such as a show-password button.
const TextField = forwardRef(function TextField(
  { label, hideLabel = false, hint, error, multiline = false, maxLength, showCount = false,
    value = '', id: idProp, className, end, rows = 3, ...rest },
  ref
) {
  const autoId = useId()
  const id = idProp || `field${autoId}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const Control = multiline ? 'textarea' : 'input'
  const nearLimit = maxLength && value.length >= maxLength - 20

  return (
    <div className={['field', error && 'field--invalid', className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : 'field__label'}>{label}</label>
      <div className='field__control'>
        <Control
          ref={ref}
          id={id}
          value={value}
          maxLength={maxLength}
          rows={multiline ? rows : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className='field__input'
          {...rest}
        />
        {end}
      </div>
      {(hint || (showCount && maxLength)) && (
        <div className='field__meta'>
          {hint && <p id={hintId} className='field__hint'>{hint}</p>}
          {showCount && maxLength && (
            <span className={['field__count', nearLimit && 'field__count--near'].filter(Boolean).join(' ')}>
              {value.length}/{maxLength}
              <span className='visually-hidden'> characters</span>
            </span>
          )}
        </div>
      )}
      {error && (
        <p id={errorId} className='field__error'>
          <ErrorOutline fontSize='inherit' />
          {error}
        </p>
      )}
    </div>
  )
})

export default TextField
