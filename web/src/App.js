import { Outlet, ScrollRestoration } from "react-router-dom"

// The root of every route. ScrollRestoration puts the scroll position back when you go
// back to a page, and starts new pages at the top.
function App() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

export default App;
