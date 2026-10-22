# weConect API v1: testing and findings

This file records how the 15 documented v1 endpoints were tested, what the tests found, and what's out of scope. Every case is in [`tests/cases.mjs`](tests/cases.mjs), and its request and response are in [`tests/captures/v1/<case>.json`](tests/captures/v1/). Case names appear in brackets below.

## How the tests ran

`npm run test:capture` starts the API from `api/` against a temporary in-memory MongoDB with random secrets, runs 75 cases in order, and saves each request and response. `npm run test:validate` then checks every captured response against [`openapi/weconect-v1.yaml`](openapi/weconect-v1.yaml).

| Item | Value |
|---|---|
| Run | 2026-10-22, committed as `tests/captures/v1/` |
| Stack | Node.js 24, Express 4.18.2, Mongoose 5.13.15 (MongoDB driver 3.7.3), MongoDB 6.0.19 |
| Cases | 75: 74 returned the status predicted from reading the code; 1 confirmed a crash |
| Spec check | 72 captures pass, 0 fail; 3 skipped (a refused connection, a CORS preflight, an unknown route) |
| Validator check | 3 deliberately wrong captures (wrong type, undocumented status, missing field) were all rejected |

The captures redact access tokens and encrypted passwords, and replace local paths with `<repo>`. IDs and timestamps change on every run.

## Scope

**Documented (15):** register, log in, get the current user, get a user, search users, follow, unfollow, list followers, list followed users, create a post, get a post, list a user's posts, get the timeline, like or unlike a post, delete a post.

**Not documented yet (8 endpoints and the real-time events):** update or delete the current user (`PUT` and `DELETE /api/users`), update a post (`PUT /api/posts`), conversations (2 endpoints), messages (3 endpoints), and the Socket.io events. Messaging and its events belong together and are planned for an AsyncAPI document.

## Findings

These are the v1 behaviours that version 2 should change. The spec documents them as they are.

### Security

1. **Search returns every user's encrypted password** [`search_all`, `search_term`]. Passwords are encrypted with AES rather than hashed ([`api/routes/auth.js:27`](api/routes/auth.js#L27)), so anyone with the server's `PASS_ENC_SECT` can decrypt them.
2. **Likes can be made on behalf of any user** [`like_on_behalf`]. The like endpoint uses `userId` from the body, not the token.
3. **Create a post stores the whole body**, so a client can set fields such as `likes` [`post_create_preset_likes`].
4. **Login reveals whether a username exists**: `404` for an unknown user, `400` for a wrong password, with the same message [`login_unknown_user`, `login_wrong_password`].
5. **Errors expose internals**: raw database errors [`register_duplicate`, `user_get_invalid_id`, `post_delete_invalid_id`] and HTML pages with stack traces and file paths [`auth_malformed_token`, `register_invalid_json`]. Express hides the stack trace only when `NODE_ENV` is `production`.

### Crashes and server errors

6. **Unliking a post crashes the server** [`unlike`, `after_unlike`]. The response is sent, then a stray `url` expression ([`api/routes/posts.js:67`](api/routes/posts.js#L67)) throws, the error handler tries to send a second response, and Node exits with `ERR_HTTP_HEADERS_SENT`. The like is removed [`post_get_after_unlike`].
7. **A malformed token returns `500`**, not `401`: `jwt.decode()` returns `null` and the middleware reads `.exp` from it [`auth_malformed_token`, `auth_no_scheme`].
8. **Unknown IDs return `500`** instead of `404` [`follow_unknown_user`, `like_unknown_post`, `post_delete_again`], and invalid ObjectIds return `500` instead of `400` [`user_get_invalid_id`, `follow_invalid_id`, `post_get_invalid_id`, `post_delete_invalid_id`].

### Status codes

9. **Validation errors use `401`** on register [`register_missing_username` and 4 more] **and `403`** on create a post [`post_create_missing_userid`, `post_create_bad_image`]. They should be `400`.
10. **Invalid and expired tokens return `403`** [`auth_bad_signature`, `auth_expired`]. `401` is the usual status for authentication failures.
11. **"Already following" and "not following" return `403`** [`follow_again`, `unfollow_again`]. `409` fits a conflict like this better.
12. **Getting an unknown post returns `200` with `data: null`** [`post_get_unknown`] instead of `404`.
13. **Register and create a post return `200`**, not `201 Created`.

### Response shapes

14. **Unfollow returns plain JSON strings** for success and "not following" [`unfollow`, `unfollow_again`], unlike every other endpoint.
15. **Delete a post's `500` body has no `status` field**: it's `{}` or the raw database error [`post_delete_again`, `post_delete_invalid_id`].
16. **User fields vary by endpoint**: search leaves out empty `profilePicture` and `coverPicture` and includes `updatedAt` [`search_all`]; get the current user and get a user leave out `updatedAt` [`me`, `user_get`].
17. **A like without `userId` stores `null`** in `likes` [`like_no_body`, `post_get_after_empty_like`].

### Validation

18. **Post length isn't limited** [`post_create_long_desc`]. The model sets `max: 500`, but Mongoose's `max` applies to numbers; strings need `maxlength`. The same applies to the username and bio limits in [`api/models/User.js`](api/models/User.js).
19. **Users can follow themselves** [`follow_self`]. The timeline code would then list their own posts twice; the test user had no posts, so this is untested [`timeline_self_follow`].

### API design

20. **One path, two meanings**: `GET /api/posts/{id}` takes a user ID, and `DELETE /api/posts/{id}` takes a post ID.
21. **Unusual paths**: `/api/users/{userId}/user`, `/api/posts/{postId}/single` and `/api/posts/timeline/all`. Follow and unfollow are `PUT` requests with the user ID in the body.
22. **No pagination** on search, a user's posts, or the timeline.
23. **The timeline isn't in date order overall**: the current user's posts come first, then each followed user's posts in turn [`timeline`].

### Found by reading the code, outside the 15 endpoints

- **Update a post can't work** ([`api/routes/posts.js:29`](api/routes/posts.js#L29)): it looks the post up by the user's ID, finds nothing, and returns `500 {}`. It also stores the whole body.
- **Update the current user stores the whole body** after a few checks, and its validation errors use `403`.

## Not tested yet

| Area | Why |
|---|---|
| The 8 out-of-scope endpoints and the Socket.io events | Planned for later phases |
| Token expiry after the real two days | Simulated instead, with a token whose `exp` has passed [`auth_expired`] |
| Behaviour with `NODE_ENV=production` | The tests run in development mode, so HTML errors include stack traces |
| Load, concurrency, and very large lists | Not part of documenting v1 |
