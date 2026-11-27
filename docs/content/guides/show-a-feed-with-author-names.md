---
title: Show a feed with author names
description: Print your timeline newest first, with each post's author, using Node.js.
---

<!--
This guide is tested: tests/docs/ adds each javascript block, in order, to the file that a
hidden step names, and runs each bash block as written. Hidden steps in comments start the
API and check the output. See CLAUDE.md, "Docs tests".
-->

<!-- test
testId: show-a-feed-with-author-names
-->

# Show a feed with author names

[Get the timeline](/reference/get-timeline) returns each post with its author's user ID, not their username. This guide shows how to get each author's username and print your timeline, newest first, with Node.js.

## Before you begin

- Start the API and save your API key in the `WECONECT_API_KEY` environment variable, as described in the quickstart's [Start the API](/quickstart#start-the-api) and [Save your API key](/quickstart#save-your-api-key) sections.
- Have Node.js 20.19 or later, which the API also needs.

The examples use the sample data that `npm run dev` creates. Your key acts as alice, who follows bob.

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
  command: rm -f *.mjs && printf feed.mjs
  workingDirectory: ../runs/docs
variables:
  DOCS_FILE: $$stdio.stdout
-->

## Get the timeline

[Get the timeline](/reference/get-timeline) returns your posts and the posts of the people you follow:

```js
async function getTimeline() {
  const url = "http://localhost:8800/api/posts/timeline/all";
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.WECONECT_API_KEY}`,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${json.message}`);
  }
  return json.data;
}
```

## Get each author once

Each post has only its author's user ID, in `userId`. [Get a user](/reference/get-user) returns the user's username. Several posts can have the same author, so get each author once, instead of once for every post:

```js
// Returns a map from each post's userId to the author's username
async function getUsernames(posts) {
  const usernames = new Map();
  for (const post of posts) {
    if (usernames.has(post.userId)) continue;
    const url = `http://localhost:8800/api/users/${post.userId}/user`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.WECONECT_API_KEY}`,
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(`${url}: ${response.status} ${json.message}`);
    }
    usernames.set(post.userId, json.data.username);
  }
  return usernames;
}
```

## Sort the posts and print them

The timeline lists your posts first, newest first, and then the posts of each user you follow. To list all the posts by date, newest first, sort them by `createdAt`:

```js
const posts = await getTimeline();
const usernames = await getUsernames(posts);

posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
for (const post of posts) {
  console.log(`${usernames.get(post.userId)}: ${post.desc}`);
}
```

## Run the code

To try the code with the sample data, copy the blocks, in order, into a file named `feed.mjs`. The `.mjs` extension makes Node run the file as a module, which allows `await` outside a function. Then, in the terminal where you saved your key, run the file:

```bash
node feed.mjs
```

The code prints each post with its author's username, newest first. With the sample data, bob's post comes first because it's newer, although the timeline lists alice's post first:

```text
bob: Hello from Bob
alice: Hello from Alice
```

Your output depends on your data. For example, the post you published in the quickstart, or posts by people you followed in [Find people and follow them](/guides/find-people-and-follow-them), appear too.

<!-- step
description: Check that the feed shows usernames, newest first
runShell:
  command: printf '%s' "${DOCS_OUTPUT}"
  stdio: '/^bob: Hello from Bob\nalice: Hello from Alice$/'
-->

<!-- test end -->

## Next steps

- See every field that a post and a user have: [Get the timeline](/reference/get-timeline) and [Get a user](/reference/get-user).
- To add specific people to your feed, see [Find people and follow them](/guides/find-people-and-follow-them).
