import { useEffect, useState } from 'react'

// The value, but only after it has stopped changing for `delay` ms. Used for search,
// so typing "alice" sends one request instead of five.
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
