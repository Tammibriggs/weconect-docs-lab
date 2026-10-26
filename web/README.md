# weConect web

The weConect frontend: a React app for posting, following people, and messaging. It talks to the API in [`api/`](../api).

## Run it

You need Node.js 18 or later and the API running. For a safe local API with sample data, run `npm run dev` from the repo root.

1. Add the two lines that `npm run dev` prints to `web/.env.local`:

   ```bash
   REACT_APP_SEVER_BASE_URL=http://localhost:8800/api/
   REACT_APP_SOCKET_URL=http://localhost:8800
   ```

2. Install and start:

   ```bash
   npm ci --legacy-peer-deps   # the flag is for @material-ui/icons, which the app doesn't use
   npm start                   # http://localhost:3000
   ```

3. Sign in as `alice` with the password `npm run dev` printed.

| Command | What it does |
|---|---|
| `npm start` | Runs the app at `http://localhost:3000` and reloads it when files change |
| `npm test` | Runs the unit tests in watch mode. In CI, use `CI=true npm test` |
| `npm run build` | Builds the production files into `build/` |

## How it's organized

| Folder | What's in it |
|---|---|
| `src/router.js` | Every route. All routes work at every screen width. |
| `src/routes/` | Route guards: `RequireAuth` (signed-in pages) and `PublicOnly` (the sign-in pages) |
| `src/pages/` | One component per page |
| `src/components/` | Components for one feature, such as `PostCard` or `ChatPanel` |
| `src/components/ui/` | The shared building blocks: `Button`, `TextField`, `Dialog`, `Avatar`, `Toast`, and others |
| `src/redux/` | The Redux store. `services/` holds the RTK Query endpoints for the API |
| `src/realtime/` | The Socket.io connection, one per signed-in session |
| `src/lib/` | Helpers with no UI: the session token, dates, numbers, image storage, and hooks |
| `src/styles/` | Plain CSS. `tokens.css` and `base.css` load first, then one file per feature |

## Design system

- **Tokens.** Every color, size, space, radius, shadow and duration is a custom property in [`src/styles/tokens.css`](src/styles/tokens.css). Use the role tokens, such as `--color-text-muted` or `--color-link`, not raw values.
  - Text colors pass 4.5:1 contrast on the surfaces they're used on, and icons and control borders pass 3:1.
  - Brand blue (`#1371EB`) is for fills, icons and focus rings. Brand-colored text uses `--color-link`.
- **Breakpoints:** 640px (icon rail), 1024px (labeled sidebar), 1280px (aside).
- **Components.** Before you write new markup for a button, field, dialog or message, use the components in `src/components/ui/`. They handle the accessibility details:
  - an icon button needs a `label`
  - dialogs use the native `<dialog>` element
  - text fields link their hint and error to the input
- **Class names.** Newer CSS uses kebab-case BEM, such as `.post-card__header`.

## Rules worth knowing

- **The session.**
  - The token is kept in `localStorage` under `weconect.token` and checked before use (`src/lib/session.js`).
  - The app signs out only when the API says the token is invalid or expired (`isAuthFailure` in `src/redux/services/api.js`). The API also uses 403 for things like "you already follow this user".
- **Lists come from list responses.** Posts render from the timeline or profile response, sorted newest first. Likes update the cached lists optimistically and undo on failure.
- **API keys** (`src/pages/ApiKeys.js`, at `/settings/api-keys`, linked from your own profile). The page uses the internal `/api/keys` endpoints, which accept only the session's token. A new key is shown once, then only its last four characters.
- **Images** go through `src/lib/imageStorage.js`. It loads Firebase only when needed, and skips empty filenames.
- **Accessibility:**
  - Interactive elements are `<button>` or `<a>`, never a clickable `<div>`.
  - Every page has one `<h1>`, set with `PageHeader`.
  - After a page change, focus moves to the new page's heading.
  - Fields draw their focus ring inside their border (`outline-offset: -2px`). The sticky page header would cover a ring drawn outside.

## Testing the UI

[`redesign/tools/`](redesign/tools) has the tools used to check the 2026 redesign:

- a mock API that copies the real API's quirks
- a headless-Chrome audit: overflow at 7 widths, landmarks, axe, focus and tap targets
- a check script for each area of the app
- `check-api-keys.mjs`, which checks the API keys page against the real API from `npm run dev` instead of the mock. Its header says how to start both.

[`redesign/README.md`](redesign/README.md) explains how to run them, and has before and after screenshots.
