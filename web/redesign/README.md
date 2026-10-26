# The 2026 frontend redesign

In October 2026 the weConect frontend was audited page by page, then rebuilt in seven phases:

1. design tokens and base styles
2. shared components, sessions and the sign-in pages
3. the router and app shell
4. the feed, posts and composer
5. profiles, people and search
6. messages
7. hardening and cleanup

This folder keeps the evidence: screenshots and audit summaries from before and after, and the tools that produced them.

## What changed, in numbers

Both audits ran the same script ([`tools/audit.mjs`](tools/audit.mjs)) against the same mock API and data. The full results are in [`before/audit-summary.json`](before/audit-summary.json) and [`after/audit-summary.json`](after/audit-summary.json).

| Measure | Before | After |
|---|---|---|
| Pages wider than the screen (at 7 widths, with a 600-character post) | 14 | 0 |
| Page checks with no `h1`, `main` or main nav | 42 of 42 | 0 of 70 |
| axe WCAG 2.1 A and AA rules failed | 3 (54 elements) | 0 |
| Keyboard focus stops with no visible focus | 8 of 17 | 0 of 19 |
| Tap targets smaller than 44px on a phone | 4 | 0 |
| API calls from sign-in to Home (1440px) | 16 | 6 |
| JavaScript downloaded first (gzipped, from `npm run build`) | 217 kB | 136 kB |
| Files in `public/assets` | 28 (6.4 MB) | 0 |

The redesign also fixes bugs that the numbers don't show:

- A refresh no longer signs you out, and there's a Sign out button.
- `/followers`, `/following` and Messages work at every width; before, they were blank on desktops.
- Deleting a text-only post works.
- A failed post no longer loses your text.
- `/following` opens on the right tab, and follower pictures show.

## Screenshots

[`before/`](before) and [`after/`](after) hold the same 14 views with the same file names, so you can compare them side by side. The "after" data has a few more posts and profile pictures, from the same mock API.

| View | Before | After |
|---|---|---|
| Sign in, desktop | [before](before/06-login-desktop.png) | [after](after/06-login-desktop.png) |
| Home, desktop | [before](before/10-home-desktop.png) | [after](after/10-home-desktop.png) |
| Home, phone | [before](before/10-home-phone.png) | [after](after/10-home-phone.png) |
| Someone's profile, phone | [before](before/13-profile-other-phone.png) | [after](after/13-profile-other-phone.png) |
| Messages on desktop, which was blank before | [before](before/45-messaging-route-desktop.png) | [after](after/45-messaging-route-desktop.png) |
| Delete a post | [before](before/43-delete-modal-desktop.png) | [after](after/43-delete-modal-desktop.png) |

## Run the checks yourself

The tools need Node.js 22 or later (for the built-in WebSocket) and Google Chrome. They use a mock API instead of the real one, so they never touch a database or real image storage.

1. **Start the mock API.** From the repo root:

   ```bash
   node web/redesign/tools/mock-api.mjs
   ```

   It listens on port 8810 and serves the data in `tests/captures/v1`, with a few more posts and pictures. It copies the real API's quirks:
   - 403 responses for both bad tokens and conflicts
   - the unlike crash
   - the one-conversation limit

2. **Start the frontend on port 3100**, pointed at the mock, from `web/`:

   ```bash
   PORT=3100 REACT_APP_SEVER_BASE_URL=http://localhost:8810/api/ REACT_APP_SOCKET_URL=http://localhost:8810 REACT_APP_IMAGE_STORAGE=fake npm start
   ```

   - Settings in the shell take priority over the ones in `.env.local`.
   - `REACT_APP_IMAGE_STORAGE=fake` keeps uploaded images in the browser instead of Firebase.

3. **Run a check.** Each one takes a folder for its output:

   ```bash
   node web/redesign/tools/audit.mjs /tmp/audit --shots   # every page at 7 widths
   node web/redesign/tools/check-session.mjs /tmp/session # sign in, sign up, persistence, expiry
   node web/redesign/tools/check-shell.mjs /tmp/shell     # redirects, skip link, focus, 404
   node web/redesign/tools/check-posts.mjs /tmp/posts     # feed, likes, delete, composer
   node web/redesign/tools/check-people.mjs /tmp/people   # profiles, edit profile, lists, search
   node web/redesign/tools/check-messages.mjs /tmp/chat   # socket, live messages, sending
   node web/redesign/tools/check-focus-clip.mjs /tmp/focus # focus rings not covered by the sticky header
   ```

The last run of each passed every check:

| Check | Passed |
|---|---|
| Session | 23 of 23 |
| Shell | 12 of 12 |
| Posts | 27 of 27 |
| People | 30 of 30 |
| Messages | 25 of 25 |
| Focus rings | 4 of 4 |

The unit tests (`CI=true npm test` in `web/`) passed 35 of 35.

The other tools:

- **`shots.mjs`** takes screenshots of any route at any width.
- **`after-shots.mjs`** retook the 14 "after" views.
- **`sync.sh`** copied each verified phase from the isolated working copy into `web/`. It stops if `web/` changed in the meantime, and it moves removed files aside instead of deleting them.
