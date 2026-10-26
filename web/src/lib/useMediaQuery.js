import { useEffect, useState } from 'react'

// Whether a CSS media query matches right now, such as '(min-width: 1024px)'.
// For the few cases where markup, not only style, depends on the screen size.
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}
