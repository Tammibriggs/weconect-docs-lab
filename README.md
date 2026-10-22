# weConect

weConect is a small social app: accounts, follows, posts, and a timeline. This repo uses it to practise API documentation end to end, from testing and writing the spec to linting, publishing, and AI integrations.

| Path | What it is |
|---|---|
| `api/` | The Express backend (MongoDB, JWT auth, Socket.io for chat) |
| `web/` | The React frontend |
| `openapi/weconect-v1.yaml` | The OpenAPI 3.1 spec for 15 v1 endpoints, written from captured responses |
| `tests/` | Live test cases, the capture runner, and the spec validator |
| `TESTING.md` | What was tested, what was found, and what's out of scope |

## Test the API and check the spec

You need Node.js 18 or later. Nothing else: the tests run the API against a temporary in-memory MongoDB with random secrets, so they never touch a real database.

```bash
npm install                 # test tooling
(cd api && npm ci)          # the API's dependencies
npm run test:capture        # run every case; captures go to tests/runs/<timestamp>/
npm run test:validate       # check the committed captures against the spec
npm run lint:spec           # lint the spec with Redocly
```

The first `test:capture` downloads MongoDB 6.0 (about 55 MB) to `~/.cache/mongodb-binaries`.

To refresh the committed evidence after an API change, run `npm run test:capture -- --out tests/captures/v1`, review the diff, and update the spec to match.

## History

`api/` and `web/` were separate repos (the `weconect-rest-api` and `main` branches of `Tammibriggs/we-conect`). Both were imported with `git subtree`, so their full history is kept.
