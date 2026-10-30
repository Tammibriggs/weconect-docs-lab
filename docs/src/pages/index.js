// The site has no home page yet, so the root opens the API overview.
// netlify.toml redirects / on the server too, so link previews and search
// engines see the overview rather than this redirect.
import { Redirect } from '@docusaurus/router';

export default function Home() {
  return <Redirect to="/reference/weconect-api" />;
}
