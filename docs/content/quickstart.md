---
title: Quickstart
description: Run the weConect API on your computer, then use curl to check your API key, publish a post, and read your timeline.
---

<!--
The quickstart is tested: tests/docs/ runs every bash block below with Doc Detective,
except blocks marked testIgnore, and the hidden steps in comments check what they return.
Write variables as ${NAME}, not $NAME: Doc Detective replaces $NAME itself, so a quoting
mistake on the page would still pass. See CLAUDE.md, "Docs tests".
-->

<!-- test
testId: quickstart
-->

# Quickstart

In this quickstart, you run the weConect API on your computer, then use curl to:

1. Check that your API key works.
2. Publish a post.
3. See the post on your timeline.

## Before you begin

The API isn't deployed yet, so you run it on your computer, with sample data. You need:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20.19 or later
- curl
- A bash or zsh terminal, such as Terminal on macOS or Linux. The commands use their syntax for variables and line breaks. On Windows, use [WSL](https://learn.microsoft.com/windows/wsl/).

## Start the API

Clone the repository and install its dependencies:

```bash testIgnore
git clone https://github.com/Tammibriggs/weconect-docs-lab.git
cd weconect-docs-lab
npm install
(cd api && npm ci)
```

Start the API:

```bash testIgnore
npm run dev
```

The first run downloads MongoDB 6.0, which is about 55 MB. When the API is ready, the command prints the sample data and an API key, among other lines:

```text
The API is running at http://localhost:8800

Sample data: alice, bob, and carol each have a post, and alice follows bob.
  alice  password secret1
  bob    password secret2
  carol  password secret3

alice's API key (read and write), for the public endpoints, for example in Postman:
  wck_EXAMPLE_KEY
```

The API runs at `http://localhost:8800` until you press Ctrl+C. Its database is in memory, so the data is deleted when you stop it, and you get a new key each time you start it. Leave it running, and open a second terminal for the next steps.

<!-- step
description: Stop the API if an earlier page's test left it running, so this page starts with fresh sample data
closeSurface: api
-->

<!-- step
description: Start the API the way the page does, and keep its output to read the key from
runShell:
  command: mkdir -p tests/runs/docs && npm run dev 2>&1 | tee tests/runs/docs/dev.log
  workingDirectory: ../..
  timeout: 180000
  background:
    name: api
    waitUntil:
      stdio: Press Ctrl+C to stop
-->

## Save your API key

An API key acts as the user who created it. The key that `npm run dev` prints belongs to the sample user alice and has the `read` and `write` scopes, so in this quickstart you act as alice.

In the second terminal, save the key in an environment variable, so that the commands in the next steps can use it:

```bash testIgnore
export WECONECT_API_KEY=wck_YOUR_API_KEY
```

Replace `wck_YOUR_API_KEY` with the key that `npm run dev` printed.

<!-- step
description: Save the key that npm run dev printed, as a reader would
runShell:
  command: grep -o 'wck_[A-Za-z0-9_-]*' tests/runs/docs/dev.log | head -1 | tr -d '\n'
  workingDirectory: ../..
variables:
  WECONECT_API_KEY: $$stdio.stdout
-->

## Check that your key works

Get the current user, which is the user your key belongs to:

```bash
curl http://localhost:8800/api/users \
  -H "Authorization: Bearer ${WECONECT_API_KEY}"
```

The response describes alice. Your IDs and dates differ from the ones shown here:

```json
{
  "status": "ok",
  "data": {
    "profilePicture": {},
    "coverPicture": {},
    "followers": [],
    "followings": [
      "6b002e4cdc14001b14677702"
    ],
    "isAdmin": false,
    "_id": "6b002e4cdc14001b146776ff",
    "username": "alice",
    "createdAt": "2026-11-20T11:26:04.505Z",
    "__v": 0
  }
}
```

If the response says `"Invalid API key"`, copy the key again from the first terminal. Remember that the key changes each time you start the API.

The `_id` field is alice's user ID. Publishing a post needs it, so save it too:

```bash testIgnore
export WECONECT_USER_ID=YOUR_USER_ID
```

Replace `YOUR_USER_ID` with the `_id` value from your response.

<!-- step
description: Check that the key works, and save the user ID, as a reader would
runShell:
  command: printf '%s' "${DOCS_OUTPUT}"
  stdio: '/"username":"alice"/'
variables:
  WECONECT_USER_ID: extract($$stdio.stdout, '"_id":"([0-9a-f]{24})"')
-->

## Publish a post

Create a post with the text "My first post from the API":

```bash
curl http://localhost:8800/api/posts \
  -H "Authorization: Bearer ${WECONECT_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${WECONECT_USER_ID}\", \"desc\": \"My first post from the API\"}"
```

The response is the new post:

```json
{
  "status": "ok",
  "data": {
    "likes": [],
    "comments": [],
    "_id": "6b002e4ddc14001b14677713",
    "userId": "6b002e4cdc14001b146776ff",
    "desc": "My first post from the API",
    "createdAt": "2026-11-20T11:26:05.988Z",
    "updatedAt": "2026-11-20T11:26:05.988Z",
    "__v": 0
  }
}
```

The `userId` in the request must be your own user ID. Without it, the API returns `403` with the message `"user id is required"`, and with another user's ID, `403` with the message `"you can only post to your account"`.

<!-- step
description: Check that the post was created
runShell:
  command: printf '%s' "${DOCS_OUTPUT}"
  stdio: '/^\{"status":"ok","data":\{.*"desc":"My first post from the API"/'
-->

## See the post on your timeline

Get your timeline, which lists your posts and the posts of the users you follow:

```bash
curl http://localhost:8800/api/posts/timeline/all \
  -H "Authorization: Bearer ${WECONECT_API_KEY}"
```

Your new post comes first. The timeline lists your posts, newest first, and then the posts of each user you follow, so bob's post comes last:

```json
{
  "status": "ok",
  "data": [
    {
      "likes": [],
      "comments": [],
      "_id": "6b002e4ddc14001b14677713",
      "userId": "6b002e4cdc14001b146776ff",
      "desc": "My first post from the API",
      "createdAt": "2026-11-20T11:26:05.988Z",
      "updatedAt": "2026-11-20T11:26:05.988Z",
      "__v": 0
    },
    {
      "likes": [],
      "comments": [],
      "_id": "6b002e4cdc14001b14677705",
      "userId": "6b002e4cdc14001b146776ff",
      "desc": "Hello from Alice",
      "createdAt": "2026-11-20T11:26:04.575Z",
      "updatedAt": "2026-11-20T11:26:04.575Z",
      "__v": 0
    },
    {
      "likes": [],
      "comments": [],
      "_id": "6b002e4cdc14001b14677707",
      "userId": "6b002e4cdc14001b14677702",
      "desc": "Hello from Bob",
      "createdAt": "2026-11-20T11:26:04.585Z",
      "updatedAt": "2026-11-20T11:26:04.585Z",
      "__v": 0
    }
  ]
}
```

<!-- step
description: Check that the new post comes first and bob's post comes after it
runShell:
  command: printf '%s' "${DOCS_OUTPUT}"
  stdio: '/^\{"status":"ok","data":\[\{[^}]*"desc":"My first post from the API"[\s\S]*"desc":"Hello from Bob"/'
-->

<!-- test end -->

## Next steps

- Follow a guide: [Find people and follow them](/guides/find-people-and-follow-them) or [Show a feed with author names](/guides/show-a-feed-with-author-names).
- Read about [authentication](/reference/weconect-api#authentication): how to create your own keys in the weConect app, and what each scope allows.
- See every field and error in the reference: [Get the current user](/reference/get-current-user), [Create a post](/reference/create-post), and [Get the timeline](/reference/get-timeline).
