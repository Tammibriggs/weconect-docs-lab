import { useEffect } from 'react'

// Sets the browser tab's title, such as "Home · weConect". Screen readers announce it
// after each page change, and it's what people see in their history and bookmarks.
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (title === undefined) return // A child page sets the title instead.
    document.title = title ? `${title} · weConect` : 'weConect'
  }, [title])
}
