# weConect

weConect is a small social app: accounts, follows, posts, and a timeline. This repo uses it to practise API documentation end to end, from testing and writing the spec to linting, publishing, and AI integrations.

| Path | What it is |
|---|---|
| `api/` | The Express backend (MongoDB, JWT auth, Socket.io for chat) |
| `web/` | The React frontend |
| `openapi/weconect-v1.yaml` | The full OpenAPI 3.1 spec: 15 endpoints, written from captured responses. Endpoints only the app uses are marked `x-internal: true` |
| `openapi/weconect-public.yaml` | The public spec: the 10 endpoints developers call with API keys. Built from the full spec by `npm run build:spec`; don't edit it by hand |
| `redocly.yaml` | Redocly settings: the two versions of the spec and the lint rules |
| `tests/` | Live test cases, the capture runner, and the spec validator |
| `scripts/` | `npm run dev`, and the code that starts the API for both the tests and `npm run dev` |
| `TESTING.md` | What was tested, what was found, and what's out of scope |
| `CHANGELOG.md` | Changes to the API in each version |
| `PROCESS.md` | The process log: decisions, numbers, problems, and who did what |
| `CLAUDE.md` | Instructions for Claude Code when working in this repo |

## Test the API and check the spec

You need Node.js 18 or later. Nothing else: the tests run the API against a temporary in-memory MongoDB with random secrets, so they never touch a real database.

```bash
npm install                 # test tooling
(cd api && npm ci)          # the API's dependencies
npm run test:capture        # run every case; captures go to tests/runs/<timestamp>/
npm run test:validate       # check the committed captures against the spec
npm run test:coverage       # check that every documented response appears in a capture
npm run lint:spec           # lint the full spec, rebuild the public spec, and lint that too
npm run build:spec          # rebuild only the public spec
```

The first `test:capture` downloads MongoDB 6.0 (about 55 MB) to `~/.cache/mongodb-binaries`.

To refresh the committed evidence after an API change, run `npm run test:capture -- --out tests/captures/v1`, review the diff, and update the spec to match.

The tests use port 8800. If something else is using it, such as `npm run start:real`, pick another port: `PORT=8810 npm run test:capture`. `npm run dev` takes `PORT` too.

## Try the API locally

```bash
npm run dev                 # sample data: alice and bob, a post each, alice follows bob, and an API key for alice
npm run dev -- --empty      # an empty database instead
```

The API runs at `http://localhost:8800` with an in-memory database, so nothing touches a real MongoDB and the data is deleted when you press Ctrl+C. The command prints the sample passwords, an API key for alice to use with the public endpoints (for example in Postman), her access token for the internal ones, and the `web/.env.local` lines for the frontend. If the API crashes (unliking a post does), it restarts with the data kept.

To use the frontend, add the printed lines to `web/.env.local`, then run `npm ci --legacy-peer-deps` and `npm start` in `web/`. The flag is needed because `web/` lists `@material-ui/icons` v4, which expects React 16 or 17; the app uses React 18 and doesn't import that package.

## Run the app with your own database

```bash
npm run start:real
```

This starts the API (port 8800) and the frontend (port 3000) together, using your settings: `api/.env`, with your MongoDB URL and secrets, and `web/.env.local`. Unlike `npm run dev`, changes are saved to your real database. The command checks first that both files exist, that dependencies are installed in `api/` and `web/`, and that both ports are free, and it tells you what to fix.

`api/.env` needs `ALLOWED_HOST=http://localhost:3000`, or the browser blocks the frontend's requests. The API restarts when you edit files in `api/`, and after a crash. Ctrl+C stops both.

## History

`api/` and `web/` were separate repos (the `weconect-rest-api` and `main` branches of `Tammibriggs/we-conect`).

- **`api/`** was imported with `git subtree`, so its history is kept. Its first commit, from March 2021, is by Safak Kocaoglu, and part of that code is still in `api/`.
- **`web/`** was imported as one commit. Its 9 earlier commits, including UI styling work by Miracle Onyenma (pull request #1), are in the original repo. The 2026 redesign replaced the files from that work.
