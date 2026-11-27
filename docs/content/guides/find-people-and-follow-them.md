---
title: Find people and follow them
description: Follow a list of users by their usernames, skipping anyone you already follow, using Node.js.
---

<!--
This guide is tested: tests/docs/ adds each javascript block, in order, to the file that a
hidden step names, and runs each bash block as written. Hidden steps in comments start the
API and check the output. See CLAUDE.md, "Docs tests".
-->

<!-- test
testId: find-people-and-follow-them
-->

# Find people and follow them

To follow someone, the API needs their user ID, but you usually know people by their usernames, such as a list of your teammates. This guide shows how to find each user's ID by their username and follow them, with Node.js.

## Before you begin

- Start the API and save your API key in the `WECONECT_API_KEY` environment variable, as described in the quickstart's [Start the API](/quickstart#start-the-api) and [Save your API key](/quickstart#save-your-api-key) sections.
- Have Node.js 20.19 or later, which the API also needs.

The examples use the sample data that `npm run dev` creates. Your key acts as alice, who follows bob but not carol.

<!-- step
description: Stop the API if an earlier page's test left it running, so this page starts with fresh sample data
closeSurface: api
-->

<!-- step
description: Start the API as the quickstart does, and keep its output to read the key from
runShell:
  command: mkdir -p tests/runs/docs && npm run dev 2>&1 | tee tests/runs/docs/dev.log
  workingDirectory: ../..
  timeout: 180000
  background:
    name: api
    waitUntil:
      stdio: Press Ctrl+C to stop
-->

<!-- step
description: Save the key that npm run dev printed, as the quickstart says
runShell:
  command: grep -o 'wck_[A-Za-z0-9_-]*' tests/runs/docs/dev.log | head -1 | tr -d '\n'
  workingDirectory: ../..
variables:
  WECONECT_API_KEY: $$stdio.stdout
-->

<!-- step
description: Name the file that "Run the code" puts the blocks in, and delete files from earlier pages
runShell:
  command: rm -f *.mjs && printf follow-users.mjs
  workingDirectory: ../runs/docs
variables:
  DOCS_FILE: $$stdio.stdout
-->

## Find a user's ID by their username

[Search users](/reference/search-users) returns every user whose username contains the search term, so searching for `bob` also returns a user named `bobby`. Keep only the exact match:

```js
// Returns the ID of the user with exactly this username,
// or undefined if no user has it
async function findUserId(username) {
  const term = encodeURIComponent(username);
  const url = `http://localhost:8800/api/users/search?search=${term}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.WECONECT_API_KEY}`,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${json.message}`);
  }
  return json.data.find((user) => user.username === username)?._id;
}
```

## Follow a user

[Follow a user](/reference/follow-user) takes the user's ID in the request body, as `{"userId": "..."}`, not in the URL. If you already follow the user, it returns `403` with the message `"you already follow this user"`. A key without the `write` scope also gets `403`, so check the error message:

```js
// Follows the user with this ID. Returns false if you already
// follow them.
async function follow(userId) {
  const url = "http://localhost:8800/api/users/follow";
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.WECONECT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });
  if (response.ok) return true;

  const json = await response.json();
  if (json.message === "you already follow this user") return false;
  throw new Error(`${url}: ${response.status} ${json.message}`);
}
```

## Get your username

The API lets you follow yourself. To skip your own username in a list, first get it from [Get the current user](/reference/get-current-user):

```js
// Returns the username of the user that your API key acts as
async function getMyUsername() {
  const url = "http://localhost:8800/api/users";
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.WECONECT_API_KEY}`,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${json.message}`);
  }
  return json.data.username;
}
```

## Follow everyone on your list

For each username, skip your own, find the user's ID, and follow them:

```js
const usernames = ["alice", "bob", "carol"];
const me = await getMyUsername();

for (const username of usernames) {
  if (username === me) {
    console.log(`${username}: skipped, that's you`);
    continue;
  }
  const userId = await findUserId(username);
  if (!userId) {
    console.log(`${username}: no user has this username`);
    continue;
  }
  if (await follow(userId)) {
    console.log(`${username}: followed`);
  } else {
    console.log(`${username}: already followed`);
  }
}
```

## Run the code

To try the code with the sample data, copy the blocks, in order, into a file named `follow-users.mjs`. The `.mjs` extension makes Node run the file as a module, which allows `await` outside a function. Then, in the terminal where you saved your key, run the file:

```bash
node follow-users.mjs
```

The code prints what it did for each username:

```text
alice: skipped, that's you
bob: already followed
carol: followed
```

<!-- step
description: Check that the code skipped alice and bob, and followed carol
runShell:
  command: printf '%s' "${DOCS_OUTPUT}"
  stdio: '/^alice: skipped, that.s you\nbob: already followed\ncarol: followed$/'
-->

Run the file again. Everyone on the list is now followed, so nothing changes. You can safely run the code whenever the list changes:

```bash
node follow-users.mjs
```

```text
alice: skipped, that's you
bob: already followed
carol: already followed
```

<!-- step
description: Check that running the code again changes nothing
runShell:
  command: printf '%s' "${DOCS_OUTPUT}"
  stdio: '/^alice: skipped, that.s you\nbob: already followed\ncarol: already followed$/'
-->

<!-- test end -->

## Next steps

- To unfollow someone, use [Unfollow a user](/reference/unfollow-user). It also takes the user's ID in the request body.
- To read the posts of the people you follow, see [Show a feed with author names](/guides/show-a-feed-with-author-names).
