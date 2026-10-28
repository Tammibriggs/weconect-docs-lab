# weConect: process log

A running record of how weConect's API documentation was built: what was done, why, the numbers, the problems, and who did what. Use it to recall the work accurately for the portfolio, posts, and interviews.

Entries are in date order, newest last. Every number names the file or command it comes from.

## Phases

| Phase | What it covers | Status |
|---|---|---|
| 0. Setup | Choose the project, combine the repos | Done 2026-10-22 |
| 1. Foundation | Test v1 and write its spec (done); upgrade dependencies and hash passwords; Docusaurus site; style guide and Vale | In progress |
| 2. CI | Spec linting, prose linting, link checks, deploy previews, a pull-request workflow; deploy the API (Render, MongoDB Atlas) | Not started |
| 3. Change management | Change the API and its spec together, changelog with `oasdiff`, deprecation notices, migration guide | Started 2026-10-26: version 1.1.0 with a hand-written changelog and one deprecated field; 1.1.1 (a bug fix) on 2026-10-27; first breaking changes planned for 2.0.0 on 2026-10-28 (findings 8 and 27) |
| 4. AI readers | `llms.txt`, Markdown versions of pages, a docs MCP server | Not started |
| 5. AI automation | AutoDoc flags docs affected by each pull request | Not started |
| 6. Developer experience | SDK and code samples, search, analytics, feedback; AsyncAPI for messaging | Not started |
| Side project: frontend redesign | Design system, app shell, every page rebuilt; sessions, accessibility and performance fixes in `web/` | Done 2026-10-25, committed 2026-10-26; not yet reviewed by me |

## Key numbers

| Number | Source |
|---|---|
| 15 of 26 endpoints in the full spec, 10 of them public | `openapi/weconect-v1.yaml`, `openapi/weconect-public.yaml` |
| 152 test cases; 151 returned the predicted status, 1 confirmed a crash | `tests/captures/v1/report.md` |
| 136 captured responses match the spec; 3 deliberately broken captures were rejected | `npm run test:validate`; entry of 2026-10-22 |
| 55 of 55 documented responses appear in a capture (39 before the 17 coverage cases) | `npm run test:coverage` |
| 27 findings, 4 of them fixed: 3 in 1.1, 1 in 1.1.1 | `TESTING.md` |
| Backend history kept (2 commits); the frontend's 9 commits squashed into 1 | `git log`; entry of 2026-10-26 |
| Frontend audit: 0 axe failures, 0 overflowing pages, 0 focus stops without focus (before: 3, 14, 8) | `web/redesign/{before,after}/audit-summary.json` |
| First JavaScript download 217 kB → 136 kB gzipped | `npm run build` in an isolated copy of `web/`, before and after |
| 5 more API problems found by reading the code while redesigning | `TESTING.md`, "Found by reading the code" |
| API keys page: 32 of 32 browser checks against the real API | `web/redesign/tools/check-api-keys.mjs` |

## Log

### 2026-10-22: Choosing the project and combining the repos

**Goal:** a project where every part of API documentation can be practised, including the parts Maritime can't support.

**Decisions**

| Decision | Why | Alternatives considered |
|---|---|---|
| Use weConect, my own app, instead of Maritime | Maritime is closed source: no code to read, no way to make breaking changes, and live tests cost credit on a real account. Maritime stays as the "documenting someone else's API" project. | A new toy API (too clean to produce realistic findings) |
| One repo: `api/`, `web/`, `openapi/`, `tests/` (and `docs/` later) | One pull request can change code, spec, and docs together; a PR agent sees both; one CI pipeline; one version tag | Separate repos, common when a docs team owns the docs, but docs drift from the code |
| Import with `git subtree` | Keeps the history of both repos (11 commits) *(changed 2026-10-26: the frontend's history is now squashed into one commit; see that day's entry)* | Copying the files, which loses history |
| Document 15 of the 23 endpoints first | Covers the core story (accounts, follows, posts, timeline) at a manageable size | All 23; messaging and its Socket.io events wait for AsyncAPI |
| Spec approach: v1 as it behaves, v2 spec-first, later code-first with an OpenAPI Overlay *(changed 2026-10-25: see that day's change of plan)* | Matches the three situations writers meet at work | Code-first only |
| Docs platform: Docusaurus, plus a day on Mintlify | Docusaurus makes me build the pipeline, which is the learning; Mintlify shows what a hosted tool automates | Mintlify only |
| Hosting, for phase 2: Render free tier and MongoDB Atlas free cluster; keep WebSockets | Render's free tier supports WebSockets; switching to polling wouldn't stop the server sleeping, and would remove the AsyncAPI scenario | Fly.io (no free tier for new users), Railway (monthly credit only) |

**Problems**

- The frontend and backend folders pointed to the same GitHub repo. They were two branches of it (`main` and `weconect-rest-api`), not a conflict.
- Both folders had uncommitted changes (a login error log and regenerated lockfiles). They were carried over as one labelled commit.

**Who did what**

- **Me:** chose weConect, set the size (10 to 15 endpoints), chose one repo, and asked for the plan to cover the whole docs pipeline.
- **Claude Code:** checked weConect against the criteria, proposed the repo layout and plan, and imported both repos.

### 2026-10-22: Testing the v1 API and drafting its spec

**Goal:** document v1 exactly as it behaves, with evidence for every status code and example.

**How the testing works**

- **Cases as data** (`tests/cases.mjs`): 75 requests in order, each with the status I expected from reading the code.
- **A runner** (`tests/capture.mjs`): starts MongoDB in memory with random secrets, starts the API as a separate process, sends each case, and saves the request and response to `tests/captures/v1/`. It forges expired and wrongly signed tokens, because it knows the secret it created, and it detects and restarts a crashed server.
- **A validator** (`tests/validate.mjs`): checks each captured status and body against the spec with Ajv.
- These are **integration tests**: real HTTP, a real server, a real (in-memory) database, nothing faked. They're **characterization tests** (record what happens) plus **contract tests** (compare with the spec), not unit tests.

**Decisions**

| Decision | Why |
|---|---|
| OpenAPI 3.1, not 3.0.3 as in Maritime | Its schemas are standard JSON Schema, so Ajv validates them directly |
| Test on the old dependencies (Mongoose 5) | So v1 documents what runs today; the captures then check the upgrade |
| Start the API as a separate process, not import it into the tests | `index.js` connects and starts listening as soon as it's loaded, so importing it would need a refactor; a separate process also tests exactly what runs |
| Commit the captures | They're the evidence for the spec, and safe: random secrets, with tokens and passwords redacted |
| One path, `/api/posts/{id}`, for GET (a user ID) and DELETE (a post ID) | OpenAPI treats `/{userId}` and `/{postId}` at the same position as the same path; documented as a v1 design flaw |
| No tool-specific anchor links in descriptions | Maritime's Scalar-style links broke; plain operation names work in any tool |
| `.mjs` for the test scripts | Lets them use `import` while `api/` keeps CommonJS |

**Results**

- 75 cases: 74 returned the predicted status; 1 confirmed that unliking a post crashes the server.
- All 72 captured API responses match the spec. Redocly reports the spec valid, with 2 expected warnings (no license; a `localhost` server).
- 23 findings, recorded in `TESTING.md`. The most serious: search returns every user's encrypted password; unliking crashes the server; likes can be made on behalf of anyone; creating a post stores the whole body; malformed tokens and unknown IDs return `500`.

**Problems and corrections**

- The MongoDB download (about 54 MB) was slow and timed out twice, so it ran once in the background. It's now cached.
- The API's MongoDB driver (3.7) predates current MongoDB releases, so the tests pin MongoDB 6.0.19, the oldest release built for Ubuntu 22.04.
- The validator passed everything on its first run. To make sure it really checks, it was fed 3 deliberately broken captures (a wrong type, an undocumented status, a missing field), and it rejected all 3.
- Two errors in `TESTING.md` were caught before committing: a wrong line number (66 instead of 67), and a claim that self-followers see their posts twice, which the test couldn't show because the test user had no posts. The claim was reworded as untested.

**Who did what**

- **Me:** chose the endpoint count and asked how the testing works.
- **Claude Code:** chose the 15 endpoints, wrote the cases, runner, and validator, ran the tests, drafted the spec, and wrote `TESTING.md` and the README.
- **Not done yet by me:** running the tests myself, the exercises below, and reviewing the spec and findings.

**What I learned**

- Testing types: unit, integration, characterization, contract, and fuzzing from the spec. These tests are integration tests that do characterization and contract testing.
- Companies use the same ingredients (a test database, contract checks), but usually with a test framework and assertions (Jest, Vitest, or `node:test` with supertest), run on every pull request. That's the target for v2.
- Writers at companies usually test the docs rather than the API: they run code samples (for example with Doc Detective), Postman collections, and link checks.
- `npm start` in `web/` fails in a fresh clone because `node_modules` isn't in Git, `.env.local` is gitignored, and the frontend needs the API running.

**Exercises**

1. Run `npm run test:capture` and read the new `report.md` and a few captures.
2. Add a case, for example a search for `a.c`, and run again.
3. Change login's `'400'` to `'401'` in the spec, run `npm run test:validate`, watch it fail, then undo it.
4. Remove `noRestart: true` from `after_unlike` and compare the results.

### 2026-10-23: How the test cases depend on each other

**What I learned**

- 53 of the 75 cases use a value saved by an earlier case, mostly the tokens and IDs from `login_alice`, `login_bob`, and `login_carol`. Many also rely on data earlier cases created, such as a follow or a like. So the cases only work as one run, in order, on a fresh database. Test frameworks usually make each test set up its own data instead, for example with `beforeEach`, so tests can run alone; that's the plan for v2.
- 33 cases test error paths (4xx, 5xx, and the crash) and 13 more test edge behaviour that returns a success status, such as liking on behalf of another user. Gaps include special characters in search, Unicode, exact length limits, empty strings, wrong methods, and form-encoded bodies.
- `TESTING.md` finding 18 says the username and bio limits aren't enforced, but only the post limit was tested. The username and bio part comes from reading the code.
- The script covers the cases, so Postman isn't needed for coverage. It's still useful to spot-check results by hand, to learn the API, and later as a Postman collection for readers. Postman's collection variables do the same job as the `save` field.

### 2026-10-24: Edge cases and a local dev server

**Goal:** close the edge-case gaps found on 2026-10-23, and make it safe to try the API by hand, in Postman or the frontend.

**What was done**

- **19 edge cases** added to `tests/cases.mjs`: special characters in search, Unicode, exact length limits, empty strings, username case, a form-encoded body, a wrong method, and empty lists. They run after the main flow, so the users they add don't change earlier results.
- **`npm run dev`** (`scripts/dev.mjs`): runs the API with an in-memory database and sample data (alice and bob, a post each, alice follows bob), prints alice's token for Postman, and restarts the API after a crash with the data kept.
- **`scripts/api-server.mjs`**: the code that starts the API, now shared by the tests and `npm run dev`, so both run the API the same way.

**Decisions**

| Decision | Why |
|---|---|
| Create the sample data through the API, not straight into the database | Uses the API the way a client would, and needs no database code |
| Restart the API automatically in `npm run dev` | Unliking a post crashes it (finding 6), which would otherwise stop a Postman session |
| Refresh all committed captures, then update the spec's example IDs and timestamps to the new values | Keeps every example identical to a committed capture; 11 values in the spec were mapped, all found in the new captures |
| Re-run the old 75 cases before adding new ones | Checks the refactor changed nothing: the results matched the committed report case for case |

**Results**

- All 19 new cases returned the predicted status. 94 cases in total; 90 captured responses match the spec, and 4 are skipped (no response, a preflight, an unknown route, an unsupported method).
- 3 new findings: look-alike accounts that differ only in case (`alice` and `Alice`), a non-JSON body silently ignored, and `404` for an unsupported method.
- Edge cases that behave correctly: special characters in search, Unicode, the 5-character password minimum, empty usernames and passwords rejected, and empty lists.
- **Correction:** `TESTING.md` finding 18 stated that the username and bio limits weren't enforced without testing them. Usernames are now tested (2 and 30 characters are accepted); bio stays labelled as untested, because only an out-of-scope endpoint sets it.
- The spec now says usernames are case-sensitive, bodies must be JSON, special characters in search match only themselves, and unknown methods return `404`.

**Problems**

- A `pkill` command matched its own shell and ended it early while testing `npm run dev`. Stopping the server by process ID worked, and a separate test confirmed Ctrl+C stops the API and MongoDB and exits with code 0.

**Who did what**

- **Me:** asked for the gap cases and `npm run dev`, and asked how technical writers test APIs.
- **Claude Code:** wrote and ran the cases, the dev server, and the shared module; refreshed the captures; and updated the spec, `TESTING.md`, the README, and `CLAUDE.md`.

**What I learned: how technical writers test APIs**

- Most writers don't write API test suites; engineers and QA own those. Writers test the docs: they run every request and code sample before publishing, usually with curl or Postman against a sandbox.
- The code writers write is usually light: Postman test scripts (`pm.test`, run in CI with Newman), small scripts that run code samples, or a doc-testing tool such as Doc Detective.
- Writers read engineers' tests to learn edge cases and error codes. Spec linting and contract testing in CI are usually set up by API platform or docs engineering teams.
- More code is expected in docs engineer and developer experience roles. My hiring research found a programming language named in 53% of postings and docs-as-code in 80%.
- The weConect test setup is closer to docs engineering than to a typical writer's testing. The skill every writer role expects is verifying each example yourself and being able to read and change test code.

### 2026-10-24: How API docs workflows work at companies

**What I learned**

- When documenting an existing API, engineers build it and its tests, writers learn the behaviour (Postman or curl, plus the code and tests) and write the spec, and CI lints the spec and checks responses against it on every pull request.
- A linter such as Redocly is configured with rules, not built. It checks the spec's structure and conventions, never behaviour, because it doesn't call the API. Behaviour needs contract tests.
- Drift is most often caught by the engineers' own tests validating responses against the spec (for example `jest-openapi` or `express-openapi-validator`). A Postman collection run with Newman in CI is another way.
- When the spec is generated from code, engineers own the structure, and writers improve descriptions through pull requests to the annotations or an OpenAPI Overlay. Behaviour, such as which errors are returned, can still drift, so contract tests are still needed.
- When the spec is written first, writers join the design review before any code exists; a mock server (Prism) lets frontend work and draft docs start early; then CI validates the implementation against the spec.
- Pull requests rerun the tests automatically, but a failure blocks the merge only if branch protection makes the check required. Breaking-change checks such as `oasdiff` often need an approval rather than failing outright.
- For weConect, `tests/validate.mjs` already exits with code 1 on any failure, so it can become a required check in phase 2.

### 2026-10-24: Chained tests and validation libraries

**What I learned**

- The cases don't need to be chained to produce the spec. Each capture is validated on its own, so independent tests work too, as long as each test sets up its own data. Some behaviours need setup either way, such as following before "already following".
- Chaining suited v1's characterization testing, and it kept IDs consistent across the spec's examples. Independent tests (setup in `beforeEach` or a helper) suit v2, because one failure doesn't break others and a single test can run alone.
- `tests/validate.mjs` uses Ajv directly, not express-openapi-validator or jest-openapi. express-openapi-validator runs inside the API and would change v1's behaviour, so it belongs in v2. jest-openapi needs Jest tests, and weConect's tests save captures to disk instead.
- Gap in `tests/validate.mjs`: it checks responses only (status, content type, and body), not captured requests, query parameters, or headers.

### 2026-10-24: What express-openapi-validator does with an incomplete spec

**How I found out:** Claude Code ran a small experiment outside the repo: an app that behaves like v1, a spec that documents only part of it, and the same 10 requests under 4 configurations (express-openapi-validator 5.6.2).

**What I learned**

- Request validation is on by default and runs before the handler. It replaced v1 behaviour: register without a username got `400` instead of `401`, a 3-character password was rejected, `Token abc` was rejected (`Bearer` required), an unknown query parameter got `400`, a path not in the spec got `404`, and a method not in the spec got `405`.
- Response validation is off by default. When on, an undocumented status (`409`) and a body of the wrong type both became `500`. With `onError`, the real response passed through and the mismatch was logged.
- So with strict response validation, every status an endpoint returns must be documented. `ignoreUndocumented` only skips paths that aren't in the spec.
- Safe adoption on an existing API: log-only first, strict in tests and CI, treat request validation as a breaking change, and document the validator's own errors.
- This is why v1 uses offline validation of captures, and why the validator belongs in v2, where its `400`s also fix finding 9.

### 2026-10-24: jest-openapi doesn't fit

- jest-openapi's last release is 0.14.2 (May 2022), its repository's last commit was in March 2023, and an open issue from December 2025 asks for OpenAPI 3.1 support. weConect's spec is 3.1, so it's not an option (`npm view jest-openapi`; GitHub issue openapi-library/OpenAPIValidators#305).
- For v2, the same check can come from express-openapi-validator with `validateResponses: true` in the test environment: any test that triggers an undocumented response fails. It loaded the 3.1 spec in the 2026-10-24 experiment.

### 2026-10-25: Authentication options, as input for v2

**What I learned**

- Register and login with a returned token is standard for an app's own backend, which is what weConect's API is. API keys are for developers and scripts calling an API directly (for example Maritime's `mk_` keys); OAuth 2.0 is for third-party apps acting for a user.
- Public APIs don't let third-party apps log in with a user's password; current OAuth security guidance deprecates the password grant.
- v1's 2-day token can't be revoked: it's a JWT checked only by its signature, and there's no refresh token or logout (`api/routes/auth.js`, `expiresIn: '2d'`). A common setup is a 15-to-60-minute access token, a longer-lived refresh token that can be revoked, and a logout endpoint.

**Proposed for the v2 design (not decided)**

- Keep login, with short-lived access tokens, refresh tokens, and logout.
- Add personal API keys: create, list, and revoke, with scopes such as `posts:read` and `posts:write`.
- Write an Authentication guide that covers both methods. OAuth stays out of scope unless I want an OAuth guide.

### 2026-10-25: A command for the app with the real database, and internal endpoints

**What was done**

- **`npm run start:real`** (`scripts/start.mjs`): starts the API (nodemon, port 8800) and the frontend (port 3000) together with my own settings, `api/.env` and `web/.env.local`, so it uses my real database. It checks first that both files exist, dependencies are installed, and both ports are free. It restarts the API after a crash, and Ctrl+C stops both.
- Installed `web/`'s dependencies. `npm ci` failed: `@material-ui/icons` v4 expects React 16 or 17, the app uses React 18, and nothing in `web/src` imports it. Newer npm versions refuse such peer conflicts; `npm ci --legacy-peer-deps` works, and the README and the command's hint say so.

**How it was tested without the real database**

- Claude Code ran it with all 4 settings the API reads (`MONGO_URL`, `JWT_SECT`, `PASS_ENC_SECT`, `ALLOWED_HOST`) set to a throwaway in-memory MongoDB. dotenv never overrides a setting that's already set, so no value from `api/.env` was applied, and `api/.env` was never opened.
- Proof: a user registered through the API appeared in the throwaway database. The frontend compiled and returned `200`; CORS allowed `http://localhost:3000`; after the unlike crash the API restarted; Ctrl+C exited with code 0 and left no processes running.

**Decisions**

| Decision | Why |
|---|---|
| Name it `start:real`, not `start` | So nobody runs the real database by accident; `npm run dev` stays the safe default |
| A small Node script, not the `concurrently` package | It also checks the setup before starting; `concurrently` is the common tool for just running two commands |
| `CLAUDE.md` says Claude Code must never run it without asking | It uses my real database and secrets |
| Install with `--legacy-peer-deps` instead of removing the unused package | Changes no files in `web/`; removing `@material-ui/icons` from `web/package.json` is the proper fix, still to decide |

**What I learned: internal endpoints**

- Companies usually keep one spec and mark internal operations, for example with `x-internal: true`, then publish a public version without them. Redocly's `remove-x-internal` decorator does this when bundling. The full spec goes to internal docs behind a login.
- Larger companies with many services often give each internal service its own spec in a service catalog, and keep the public API as a separate, curated spec.
- Maritime published its internal endpoints: its official spec has 228 paths, about 170 of them dashboard-internal, while its docs page says those are intentionally undocumented. Filtering when publishing would have kept them out.
- Leaving an endpoint out of the docs doesn't secure it; internal endpoints still need authentication.

**Who did what**

- **Me:** asked for the command and about internal endpoints.
- **Claude Code:** wrote and tested the command, installed `web/`'s dependencies, and updated the README and `CLAUDE.md`.

### 2026-10-25: Change of plan: no more work on how specs are created

**Decision:** I won't explore other ways of creating the spec for now, neither writing v2 spec-first nor generating it from code with an OpenAPI Overlay. I have the spec, so I'm moving on to the next phases.

- The v1 spec stays the base. Later changes to the API and the spec are made together, by whatever method is quickest.
- Phase 3 still covers versioning, the changelog, deprecation, and a migration guide, since those need API changes, not a particular way of writing the spec.
- What I learned about the three workflows (2026-10-24) stays in this log for interviews.

### 2026-10-25: Auditing and redesigning the frontend

**What was done**

- **An audit of every page.** Claude Code read all 55 source files in `web/`, then screenshotted an isolated copy at 390, 700, 900 and 1440px. It found, among other things:
  - One long word made pages 5,400px wide.
  - A refresh signed you out, and there was no way to sign out.
  - Three routes were blank on desktops.
  - Text-only posts couldn't be deleted.
- **A plan** with my choices: a new design system plus frontend-only UX fixes, and no API changes. The look evolves: brand blue `#1371EB` and Hanken Grotesk stay.
- **The rebuild, in 7 phases**, each checked before it was copied into `web/`:
  1. tokens and base styles
  2. components, sessions and the sign-in pages
  3. the router and app shell
  4. the feed, posts and composer
  5. profiles, people and search
  6. messages
  7. lazy loading, StrictMode, cleanup and unit tests
- **Five API problems** found along the way, added to `TESTING.md` under "Found by reading the code". The worst: you can only ever have one conversation.

**How it was tested without the real database**

- **An isolated copy.** All the work ran in a copy of `web/` with no `.env` files, on port 3100. `npm run start:real` was running on 3000 and 8800 with my real database, and its dev server reloads every saved file. Claude Code never used those ports and never opened `web/.env.local`.
- **A mock API** (`web/redesign/tools/mock-api.mjs`) serves `tests/captures/v1` and copies the API's quirks.
- **Image storage was faked** in the browser, and the test browser blocked Firebase's hosts, so no real files were touched.
- **Headless Chrome scripts** in `web/redesign/tools/` checked every phase. The last run passed 117 of 117 checks across sign-in, shell, posts, people and messages, and 32 of 32 unit tests.

**Numbers** (before → after, from `web/redesign/{before,after}/audit-summary.json` and `npm run build`)

| Measure | Before | After |
|---|---|---|
| Pages wider than the screen (7 widths) | 14 | 0 |
| axe WCAG 2.1 AA rules failed | 3 (54 elements) | 0 |
| Focus stops with no visible focus | 8 of 17 | 0 of 19 |
| Page checks with no `h1`, `main` or nav | 42 of 42 | 0 of 70 |
| API calls from sign-in to Home | 16 | 6 |
| JavaScript downloaded first (gzipped) | 217 kB | 136 kB |
| Files in `web/public/assets` | 28 (6.4 MB) | 0 |

**Decisions**

| Decision | Why |
|---|---|
| Build in an isolated copy, then copy each verified phase into `web/` | `start:real` hot-reloads `web/src` against my real database and Firebase |
| Keep the token in `localStorage`, check `exp` before use | A refresh shouldn't sign you out. HttpOnly cookies would need API changes |
| Sign out only on 401, or on a 403 that says the token is invalid or expired | The API also uses 403 for conflicts, such as following someone twice |
| Native `<dialog>` for dialogs | The browser handles focus, Escape and inertness; it replaced two dialog systems (a custom one and Mantine) |
| A Post page instead of a composer dialog | Simpler, works on phones, and leaves only two dialogs |
| Render posts from the list response; update likes optimistically | No per-post requests, and no refetch races the API while it restarts after an unlike |
| Show the one-conversation limit instead of working around it | The fix belongs in the API (v2); the app shouldn't post into the wrong thread |
| Keep `package.json` as it was | I chose not to clean up dependencies. Mantine, axios, moment, `react-moment` and `@material-ui/icons` are now unused |

**Problems along the way**

- **The scratchpad was wiped.** A session restart lost the test tools and the Phase 3 work in progress. The tools now live in `web/redesign/tools/`, and Phase 3 was redone.
- **A slow font host blocked the page.** Google Fonts took about 6 seconds per request, and the stylesheet blocked the first paint. It now loads without blocking.
- **StrictMode caught a focus bug.** A "skip the first render" check moved focus to the page heading on first load, past the skip link. It now compares paths instead.
- **A failed save erased what you typed.** RTK Query refreshes caches even after a failed request, so a failed profile save reset the dialog. The save now refreshes caches only when it succeeds.

**Who did what**

- **Me:** asked for the review, chose the scope and the visual direction, approved the plan, and approved running an isolated copy for screenshots.
- **Claude Code:** did the audit, built the mock API and the test tools, rebuilt the frontend, checked each phase, and wrote `web/README.md`, `web/redesign/README.md`, the `TESTING.md` additions and this entry.
- **Not done yet:** I haven't reviewed or tried the new frontend myself, and nothing is committed.

### 2026-10-25: A lighter look, and focus rings the header covered

**What was done**

- **A clipped focus ring.** I noticed that when the feed composer, the Search field or the Messages search had focus, the top of its outline was hidden. The cause: the sticky page header has a background and sits above the content, so it painted over the 2px outline drawn *outside* each field. Fields now draw their focus ring inside their border (`outline-offset: -2px`), the composer uses an inset ring, and the header has a little space under it. A new check, `web/redesign/tools/check-focus-clip.mjs`, focuses each field and fails if the header overlaps its ring.
- **A lighter, friendlier look.** I said the site felt heavy. Claude Code kept the brand blue and font and changed:
  - a lighter page background (`#f7f8fa`) and softer borders and shadows
  - rounder corners, pill-shaped buttons and tabs
  - semibold (600) headings instead of bold
  - a lighter nav: no bold labels, and a soft pill for the active page
  - a light blue "tonal" Follow button in lists; the solid blue stays for the main action on a profile
  - pastel gradient covers on profiles without a cover photo
  - more space between posts
  - a greeting on Home ("Good evening, alice") and a friendlier prompt ("What's on your mind, alice?")
  - a light sign-in panel with a small, decorative preview of a post and a chat, in place of the solid blue panel

**How it was checked:** in the isolated copy against the mock API, as before. Every check passed: focus rings 4 of 4, session 23, shell 12, posts 27, people 30, messages 25, and 35 of 35 unit tests. The audit numbers didn't change: no overflow, no axe failures, and all 19 focus stops visible. The "after" screenshots in `web/redesign/after/` were retaken.

**Who did what**

- **Me:** reported the heavy feel and the clipped outline, with a screenshot.
- **Claude Code:** found the cause, made the changes, wrote the new check and this entry.
- **Not done yet:** I haven't tried the lighter look myself, and nothing is committed.

### 2026-10-26: API keys, a public spec, and version 1.1.0

**Goal:** practise `x-internal: true` by splitting the API into public and internal endpoints, and give developers API keys, which suit a public REST API better than logging in with a password.

**My decisions**

| Decision | What I chose |
|---|---|
| Public endpoints (9) | Get the current user, get a user, search users, follow, unfollow, create a post, list a user's posts, get the timeline, like or unlike a post |
| Internal (`x-internal: true`) | Register, log in, and the new key endpoints |
| Out of the spec | List followers, list followed users, get a post, delete a post. Claude Code pointed out that the app uses three of them and suggested marking them internal instead; I chose to remove them |
| How developers get a key | An API keys page in the app |
| Scopes | `read` and `write` |
| Security fixes in the same change | Yes: findings 1 (search returned passwords) and 2 (likes on behalf of anyone) |
| Upgrading dependencies and hashing passwords | Left in phase 1, unchanged |

**What was built**

- **API** (`api/`): an `ApiKey` model that stores only a SHA-256 hash of each key; internal endpoints to create, list, and delete keys; `verifyTokenOrApiKey(scope)` on the 9 public endpoints; and the two fixes. Keys look like `wck_` plus 32 random characters and are sent as `Authorization: Bearer`.
- **Spec**: version 1.1.0, with an `ApiKeyAuth` scheme whose scopes are listed per operation (`ApiKeyAuth: [read]`, valid in OpenAPI 3.1), new 401 and 403 responses, and the deprecated `userId` on likes. `redocly.yaml` builds the public spec with the `remove-x-internal` and `remove-unused-components` decorators.
- **App** (`web/`): the API keys page, linked from your own profile, and a cache tag for keys.
- **Tooling**: `PORT` support in the tests and `npm run dev`; `npm run dev` now prints an API key; `npm run build:spec`; a `CHANGELOG.md`.

**How it was done safely**

- `npm run start:real` was running with my real database, and its nodemon reloads `api/` on every save. So the backend was built and tested in a copy of the repo on other ports, and the frontend in a copy of `web/` on port 3100, as in the redesign. Checksums taken at copy time confirmed nothing in the working tree had changed before the work was copied back.
- `start:real` had stopped by the time the code was copied back, so my running API never ran unfinished code. When I start it again, the new code creates an empty `apikeys` collection, with its indexes, in my real database.

**Results**

- 129 cases, 35 of them new for API keys: 128 returned the predicted status, and 1 confirmed the unlike crash. 110 captured responses match the full spec.
- The public spec has exactly the 9 public operations, one security scheme, and no internal tags, examples, or schemes; 10 unused components were removed. Both specs lint clean (2 expected warnings).
- The API keys page passed 32 of 32 browser checks against the real API: creating a key, seeing it once, using it from outside the browser, deleting it, axe accessibility checks, focus, and phone layout. The redesign's 6 check suites (121 checks) and 35 unit tests still pass.

**Problems and what they taught**

- **The existing tests caught a regression.** The new middleware was an `async` function, so a malformed token made the server crash instead of returning `500`: Express 4 catches errors thrown synchronously, but not rejected promises. Two old cases, `auth_malformed_token` and `auth_no_scheme`, failed and showed it. The fix keeps the token path synchronous.
- **Redocly's `remove-x-internal` removes an internal security scheme but not the references to it**, which made the public spec invalid in an experiment. So public operations list only `ApiKeyAuth`, and the internal `AccessToken` scheme says it also works on them.
- **Refreshing the captures would have broken the redesign's checks.** Its mock API seeds itself from two capture files and hard-codes their user IDs, and every refresh changes all IDs. The mock now reads a frozen copy of those two files.
- **A third button didn't fit on phones.** Next to Edit profile and Sign out, an API keys button pushed Sign out onto a second line, overlapping the cover. Measuring showed phones have 202 to 272px for the buttons; three need about 340. The link moved under the follower counts.
- **One redesign check is flaky:** "a photo that can't load shows a message" failed once and passed on two reruns; it depends on when a broken image finishes failing.
- **My own mistakes:** a `pkill` pattern matched its own shell again; a check script asked the browser to return a DOM element; a first draft added a 10-key limit nobody asked for, removed before testing.

**Who did what**

- **Me:** proposed making register and login internal and adding API keys, chose the public endpoints, the removals, the settings page, scopes, and the two fixes.
- **Claude Code:** built and tested the API changes, the spec split, the page, and the tooling; refreshed the captures; and updated `TESTING.md`, `CHANGELOG.md`, the READMEs, `CLAUDE.md`, and this entry.
- **Not done yet by me:** trying the API keys page and calling the API with a key, and reviewing the public spec. Nothing is committed.

**What I learned**

- How API keys are usually built: a prefix so they're recognizable, only a hash stored, shown once, scopes, `lastUsedAt`, and immediate revocation.
- Additive changes are a minor version (1.0.0 to 1.1.0). Removing a response field is normally breaking; a security leak is the usual exception.
- `x-internal` with Redocly decorators gives one source spec and two outputs, and its limits.
- In Express 4, a rejected promise in middleware crashes the server, while a synchronous throw becomes a `500`.

### 2026-10-26, later: Delete a post becomes the 10th public endpoint

**Decision (mine):** exactly 10 public endpoints, so Delete a post is public again. I asked whether to leave the gap for the WebSocket events instead; they won't fill it, because Socket.io events aren't REST endpoints and belong in a separate AsyncAPI document. This updates the earlier entry, which listed 9 public endpoints and 4 left out of the spec.

- **API:** delete a post now accepts an API key with the `write` scope (`api/routes/posts.js`). Part of 1.1.0, which wasn't committed yet.
- **Spec:** the path is `/api/posts/{id}` again, shared by List a user's posts (a user ID) and Delete a post (a post ID), because OpenAPI treats `{userId}` and `{postId}` at the same position as the same path. Each operation's description says which ID it takes (finding 20).
- **Tests:** 3 new cases: a read-only key can't delete, bob's key can't delete alice's post, and alice's key deletes her own. 132 cases, 131 as predicted plus the unlike crash; 117 captured responses validate; the public spec has exactly 10 operations.
- **How:** built and tested in the repo copy on port 8810, because `start:real` was running again; one file in `api/` was copied back, so my running API restarted once. **Problem:** the check for files changed during the work failed (this system's `find` rejected a relative date) and the copy went ahead anyway. A corrected check afterwards found that nothing else had changed.
- **Left out of the spec now (3):** list followers, list followed users, get a post.

### 2026-10-26: Committed

At my request, Claude Code committed everything that was uncommitted, in two commits on `main`. The entries above that say "nothing is committed" describe the state at the time.

- `4349184` (first committed as `e315668`): the API, the spec and public spec, the tests and captures, the scripts, and the docs: everything from 2026-10-23 to 2026-10-26 outside `web/`.
- `ec0e4f1` (first committed as `f0f21f0`): `web/`: the redesign and the API keys page. They're one commit because the page edits files the redesign created.

The repo has no remote yet, so nothing is pushed.

### 2026-10-26: Squashing the frontend's history

**Decision (mine):** remove Miracle Onyenma from the repo's GitHub contributors list by squashing the frontend's imported history into one commit, crediting their work in the commit message and the README. I chose this over leaving the history as it was, and over re-crediting their commits to me, which would have claimed their work.

**Why it's fair:** Miracle helped with the original UI (pull request #1, March 2023), but none of that code is left. `git blame -w -C -C -C` over every file in `web/src` and `web/public`, which also follows code moved or copied between files, credits 0 lines to their commits. The only lines still credited to them were 1,228 generated lines in `web/package-lock.json`.

**How it was done** (the repo hadn't been pushed, so rewriting it was safe):
- A backup branch, `backup/before-squash`, keeps the old history.
- `git commit-tree` made one commit with the frontend import's exact files, and `git rebase --onto` replayed the 5 later commits on top. Every commit after the import has a new ID.
- `git diff backup/before-squash main` is empty: the files are byte-for-byte identical.

**A surprise:** the backend's first commit is by Safak Kocaoglu, dated 25 March 2021, with the message "commit". I don't remember him contributing. The package name `rest-api`, port 8800, and the "Backend server is running!" message suggest the backend started as a clone of a tutorial repo, which keeps its history. 228 lines of his code are still in `api/`, across the models, routes, `index.js`, and `package.json` (`git blame -w`, lockfiles excluded), so his commit stays, and the README credits him.

**Who did what**
- **Me:** chose to remove Miracle from the list, and chose this option.
- **Claude Code:** checked the authorship, rewrote the history, verified it, and updated the README and this log.

**Correction (2026-10-27):** the repo had been pushed. I pushed the old history to `Tammibriggs/weconect-docs-lab` at 12:46 on 2026-10-26, before the squash, so GitHub still has Miracle's commits until the squashed `main` is force-pushed. Local `main` and `origin/main` have diverged (`git status`: ahead 7, behind 15).

### 2026-10-27: Testing in Postman, and a misleading user schema

**What I'm doing:** testing the 10 public endpoints in Postman, using the public spec imported as a collection, an environment, the API key set once on the collection, a Setup folder that logs in and creates the keys, and test scripts on each request. In progress.

**What I found so far:**
- **Get the current user's schema showed `updatedAt`, but the response didn't have it.** The route removes it along with the password ([`api/routes/users.js:88`](api/routes/users.js#L88), and `:101` for get a user), while search removes only the password (finding 16). The spec used one `User` schema for all three, with `updatedAt` optional and a note in its description. The validator passed, but the docs showed a field these two endpoints never return.
- **My status check failed on creating an API key:** it returns `201`, not `200`. The public endpoints all return `200` on success, even create a post (finding 13).

**Fix (docs only; the API and captures are unchanged):** `User` no longer has `updatedAt`. A new `UserWithUpdatedAt` schema adds it, as required, using `allOf`; search and login use it.

**Checks:**
- `npm run lint:spec`: both specs valid; the public spec has its 2 usual warnings.
- `npm run test:validate`: 117 passed, 0 failed, 15 skipped, as before.
- Copies of the search, login, and get-the-current-user captures with `updatedAt` removed: search and login now fail, and get the current user passes. Before the fix, all three passed.

**What I learned:**
- An optional field in a shared schema shows up in every operation that uses it. "Optional" reads as "sometimes returned", not "only returned by another endpoint". When fields differ by endpoint, split the schema.
- The expected status comes from each operation's `responses` in the spec, not from a rule such as "success is 200".
- Error cases in Postman are usually duplicated requests, one per case, because each needs its own key, path, or body.
- **What to call the Postman tests:** black-box functional API tests, with positive and negative cases, chained into a workflow. They're integration-level (real HTTP, real code, a database), not unit or end-to-end tests. They aren't contract tests yet, because they check chosen fields, not every response against its schema; `npm run test:validate` is the contract check. The repo's own cases are characterization tests: they recorded the behaviour the spec was written from, while the Postman tests start from the spec.

**Who did what**
- **Me:** set up Postman and ran the collection; spotted the `updatedAt` mismatch and the `201`.
- **Claude Code:** explained the causes, split the schema, ran the checks, and updated the spec, `CHANGELOG.md`, `TESTING.md`, and this log.

### 2026-10-27, later: Version 1.1.1: a value that isn't a key returns `401`, not `500`

**What I found in Postman:** `Authorization: Bearer 2434143` on get the current user returned `500`, an HTML page with a stack trace. I expected the documented `401 Invalid API key`.

**Why:** the API decides what a value is by its prefix. Anything without `wck_` is treated as an access token; `jwt.decode()` returns `null` for a value that isn't a JWT, and the middleware read `.exp` from `null` and threw (finding 7). The docs listed the `500`, but in terms ("something other than an API key") a reader can't match to a mistyped key.

**Decision (mine):** fix the API rather than only clarify the docs. A bad credential is the client's mistake, so it should get a `4xx`, and the `500` page leaked a stack trace.

**The fix** ([`api/routes/verifyToken.js`](api/routes/verifyToken.js)):
- Public endpoints: a header value that's neither an API key nor a JWT returns `401 "Invalid API key"`, like any other wrong key. That covers a key without its prefix and a key without `Bearer` in front.
- Internal endpoints: the same value returns `403 "Token is invalid"`, like any other bad token. The app already signs out on that response ([`web/src/redux/services/api.js:18-19`](web/src/redux/services/api.js#L18-L19)), so `web/` needed no change.
- Version 1.1.1: a bug fix that changes an error status, not anything that worked before.

**Tests:** 2 cases changed their expected status from `500` (`auth_malformed_token`, `auth_no_scheme`), and 3 are new: `key_without_prefix` (the value I tried), `key_without_bearer`, and `auth_malformed_token_internal`. Run on port 8810, because my `npm run dev` was using 8800.

**Spec:** removed the `500` from get the current user and search users, the malformed-token part of get a user's `500`, and the `MalformedToken` response; the authentication errors table and the `401` description now spell out the `wck_` prefix and `Bearer`.

**Checks:**
- `npm run test:capture`: 135 cases, all as predicted, 1 restart (the unlike crash).
- `npm run test:validate`: 119 passed, 0 failed, 16 skipped.
- `npm run lint:spec`: both specs valid, 2 usual warnings each.
- The refresh gave every user, post and key a new ID. A script mapped the spec's example IDs and timestamps from the old captures to the new ones (42 replacements). It also showed that two key endings in the examples (`9XAa`, `W1_B`) had never matched any capture; they now do.

**What I learned:**
- The validator checks that each captured response is documented, but not that each documented response still happens. Removing the `500` from the spec had to be done by hand.
- A documented bug is still a bug. Docs that describe a `500` accurately can still fail the reader, when they're written in the API's terms ("not an API key") instead of the reader's ("I mistyped my key").

**Who did what**
- **Me:** found the `500` in Postman and chose to fix the API.
- **Claude Code:** traced the cause, changed the middleware, added and updated the cases, refreshed the captures, updated the spec, `CHANGELOG.md`, `TESTING.md`, `CLAUDE.md` and this log, and ran the checks.

### 2026-10-28: How API keys are checked, and a wrong scope example

**What I learned by asking:**
- **Only a hash of each key is stored.** When a key is created, the API stores its SHA-256 hash and returns the key itself once ([`api/routes/keys.js:42-47`](api/routes/keys.js#L42-L47)). On each request it hashes the key it receives and looks for that hash ([`api/routes/verifyToken.js:58`](api/routes/verifyToken.js#L58)). Nothing is hashed twice: SHA-256 always gives the same output for the same input, so a correct key finds its record. A leaked database holds no usable keys, and SHA-256 can't be reversed.
- **Why SHA-256 and not bcrypt**, which suits passwords: a key is 24 random bytes, far too many combinations to guess, so a fast hash is safe. bcrypt adds a random salt to every hash, so the API couldn't look a key up by its hash; it would have to check every stored key.
- **A key can be write-only.** The app's page offers read only, and read and write, but the API also accepts `["write"]` alone [`keys_create_write_only`]. Such a key gets `403 "This API key doesn't have the 'read' scope"` on the read endpoints, including get the current user.

**What my question found:** the shared `Forbidden` response, used by the 5 read endpoints and like, shows only the `'write'` message, which can't happen on a read endpoint. The read-scope `403` is captured only on search [`key_write_only_read`], not on get the current user.

**More from Postman (mine):**
- **List a user's posts with an ID that isn't a user returned `200`** with an empty list. That's documented on the `id` parameter and tested [`posts_by_unknown_user`], but it wasn't a finding. It's now finding 27: a mistyped ID looks like a user with no posts, while get a user returns `404` for the same ID.
- **Like in my Errors folder returned `500`**, because the post no longer existed: `findById` returns `null`, reading `likes` from it throws, and the error serializes as `{}` (finding 8, `like_unknown_post`).
- **Liking an existing post returned `200` without a crash.** Only removing a like crashes (finding 6), and the crash doesn't show in Postman: the `200` is sent first, and `npm run dev` restarts the API within about a second. A reproduction on port 8830 showed it only in the terminal (`ERR_HTTP_HEADERS_SENT`, then "The API exited… Restarting"); a request sent at once was refused, and one sent 3 seconds later worked.

**Who did what**
- **Me:** asked why the key is hashed before the lookup, and whether get the current user can return a scope error; found the empty list and the `500` in Postman.
- **Claude Code:** explained both from the code and the captures, found the wrong example, reproduced the like behaviour, and recorded finding 27.

### 2026-10-28, later: Response coverage, the scope `403`, and planning 2.0.0

**Decisions (mine):**
- Add a response coverage check and fix the `403` example: docs and tests only, no version change.
- **Save the list-posts fix (finding 27) for 2.0.0**, with finding 8. I'd asked for it as a fix, then learned it's a breaking change: the empty list is documented, and GitHub's REST API docs count "adding a new validation rule to an existing parameter" as breaking. Companies batch breaking changes so clients migrate once, with notice.

**Response coverage** (`npm run test:coverage`, [`tests/coverage.mjs`](tests/coverage.mjs)):
- `test:validate` checks that every captured response is documented. Coverage checks the reverse: that every documented status appears in a capture. A documented status with no capture is either untested or stale.
- The route lookup moved from `validate.mjs` into [`tests/spec.mjs`](tests/spec.mjs), shared by both. `validate` gave the same result before and after (119 passed, 0 failed, 16 skipped).
- First run: 39 of 55 documented responses had a capture. The 16 missing were all `401` and `403` responses, documented because every public endpoint shares the same middleware, but captured on only some of them.
- **17 new cases** (16 for the missing responses, plus `key_write_only_me` for the `'read'` message on get the current user), added after the API keys cases. Each is rejected before it changes anything, so earlier results stayed the same.
- **Proof it works:** with the spec from before 1.1.1 and the captures from after it, coverage lists the two stale `500` responses I'd removed by hand. Its limit: it checks statuses, not wording, so it would have missed the stale sentence in get a user's `500`, which still happens for an invalid ID.

**The `403` fix:** the shared `Forbidden` response became `ReadScopeForbidden` (the 5 read endpoints, `'read'` message) and `WriteScopeForbidden` (like, `'write'` message). The authentication errors table lists both messages.

**Checks:**
- `npm run test:capture` (port 8810, because my `npm run dev` was on 8800): 152 cases, all as predicted, 1 restart (the unlike crash).
- `npm run test:validate`: 136 passed, 0 failed, 16 skipped.
- `npm run test:coverage`: 55 of 55.
- `npm run lint:spec`: both specs valid, 2 usual warnings each.
- The spec's example IDs, timestamps and key endings were remapped to the new captures by a script (45 replacements, none left unmapped).

**What I learned:**
- Checking captures against the spec is only half the check. The other half asks whether everything the spec documents still happens.
- Whether a change is breaking depends on what was documented, not on whether the old behaviour was good. A bad but documented behaviour is still a promise.
- Versioning is decided before coding: the version decides when a change can ship.

**Who did what**
- **Me:** asked for the coverage check and the `403` fix, and chose to save finding 27 for 2.0.0.
- **Claude Code:** wrote the coverage check and the 17 cases, split the response, refreshed the captures, ran the checks, and updated the spec, `TESTING.md`, `CHANGELOG.md`, `README.md`, `CLAUDE.md` and this log.

## Post and portfolio ideas

- Testing my own API before documenting it turned up 23 problems, including search leaking every user's encrypted password.
- Characterization tests: how to document an API exactly as it behaves, with evidence for every example.
- One command, no database to install: testing an Express API with MongoDB in memory.
- Moving two repos into one without losing history, and why docs belong in the same repo as the code.
- How technical writers actually test APIs, and where code fits in.
- One spec, two audiences: publishing a public API reference from a spec with internal endpoints, and the Redocly gotcha I hit.
- My characterization tests caught a regression I'd never have looked for: an `async` middleware that turned a `500` into a server crash.
- One long word broke every page: auditing my own frontend with headless Chrome and axe, with before and after screenshots (`web/redesign/`).
- Why "403 means sign out" is wrong for this API, and what that teaches about documenting status codes.
