# weConect API: testing and findings

This file records how the documented endpoints were tested, what the tests found, and what's out of scope. Version 1.1 (2026-10-26) added API keys and fixed findings 1, 2 and 17, and version 1.1.1 (2026-10-27) fixed finding 7; [`CHANGELOG.md`](CHANGELOG.md) lists the changes. Every case is in [`tests/cases.mjs`](tests/cases.mjs), and its request and response are in [`tests/captures/v1/<case>.json`](tests/captures/v1/). Case names appear in brackets below.

## How the tests ran

`npm run test:capture` starts the API from `api/` against a temporary in-memory MongoDB with random secrets, runs 183 cases in order, and saves each request and response. `npm run test:validate` then checks every captured response against the full spec, [`openapi/weconect-v1.yaml`](openapi/weconect-v1.yaml), and `npm run test:coverage` checks the other direction: that every response and every response field the spec documents appears in a capture.

| Item | Value |
|---|---|
| Runs | 75 cases on 2026-10-22; 19 edge cases added and all 94 re-run on 2026-10-24; 38 cases for API keys added and all 132 re-run on 2026-10-26; 3 cases for values that are neither a key nor a token added and all 135 re-run on 2026-10-27; 17 cases for response coverage added and all 152 re-run on 2026-10-28; 21 cases for field coverage added and all 173 re-run later that day; 6 cases for invalid JSON added and all 179 re-run on 2026-10-29; 4 cases for 12-character IDs and empty lists added and all 183 re-run later that day, committed as `tests/captures/v1/` |
| Stack | Node.js 24, Express 4.18.2, Mongoose 5.13.15 (MongoDB driver 3.7.3), MongoDB 6.0.19 |
| Cases | 183: 182 returned the status predicted from reading the code; 1 confirmed a crash |
| Spec check | 165 captures pass, 0 fail; 18 skipped: 14 on endpoints the spec leaves out (see Scope), plus a refused connection, a CORS preflight, an unknown route and an unsupported method |
| Validator check | 3 deliberately wrong captures (wrong type, undocumented status, missing field) were all rejected |
| Response coverage | 57 of 57 documented responses and 219 of 219 documented fields appear in a capture. With the spec from before 1.1.1, the check lists the two `500` responses that version removed. Before the field cases, 42 fields had no capture |
| Invalid JSON | All 7 endpoints with a body return `400` with Express's HTML error page [`*_invalid_json`]. Until 2026-10-29 the spec documented it only on register: with the spec from before, `test:validate` fails the 6 new captures |

The captures redact access tokens, API keys and encrypted passwords, and replace local paths with `<repo>`. IDs and timestamps change on every run, so each refresh also updates the spec's examples to the new values.

## Scope

The spec documents 15 endpoints. `npm run build:spec` builds the public version from it, without the ones marked `x-internal: true`.

**Public (10), called with an API key:** get the current user, get a user, search users, follow, unfollow, create a post, list a user's posts, delete a post, get the timeline, like or unlike a post.

**Internal (5), used by the weConect app:** register, log in, and create, list and delete API keys.

**Left out of the spec (3), tested but not documented:** list followers, list followed users, get a post. The app uses the first two. They were in the spec until 2026-10-26.

**Not documented yet (8 endpoints and the real-time events):** update or delete the current user (`PUT` and `DELETE /api/users`), update a post (`PUT /api/posts`), conversations (2 endpoints), messages (3 endpoints), and the Socket.io events. Messaging and its events belong together and are planned for an AsyncAPI document.

## Findings

These are behaviours a later version should change. The spec documents them as they are. Findings marked **Fixed** were fixed in version 1.1 on 2026-10-26, or in the version they name.

### Security

1. **Fixed: search returned every user's encrypted password.** Since 1.1 the results leave the password out [`search_all`, `search_term`, `key_search`]. Passwords are still encrypted with AES rather than hashed ([`api/routes/auth.js:27`](api/routes/auth.js#L27)), so anyone with the server's `PASS_ENC_SECT` can decrypt them.
2. **Fixed: likes could be made on behalf of any user.** The like endpoint used `userId` from the body, not the token. Since 1.1 it ignores `userId` and always uses the caller: `like_on_behalf` sends carol's ID with alice's token, and the like is alice's [`post_get_after_likes`].
3. **Create a post stores the whole body**, so a client can set fields such as `likes` [`post_create_preset_likes`]. That lets a client make a post look liked by other users, which finding 2 fixed for the like endpoint. Not fixed yet. Since 2026-10-28, the reference no longer mentions it: telling readers about it would invite abuse, and it would make the fix a breaking change.
4. **Login reveals whether a username exists**: `404` for an unknown user, `400` for a wrong password, with the same message [`login_unknown_user`, `login_wrong_password`].
5. **Errors expose internals**: raw database errors [`register_duplicate`, `user_get_invalid_id`, `post_delete_invalid_id`] and HTML pages with stack traces and file paths [`register_invalid_json` and the 6 other `*_invalid_json` cases; a malformed token returned one too, until 1.1.1]. Express hides the stack trace only when `NODE_ENV` is `production`.

### Crashes and server errors

6. **Unliking a post crashes the server** [`unlike`, `after_unlike`]. The response is sent, then a stray `url` expression ([`api/routes/posts.js:69`](api/routes/posts.js#L69)) throws, the error handler tries to send a second response, and Node exits with `ERR_HTTP_HEADERS_SENT`. The like is removed [`post_get_after_unlike`].
7. **Fixed in 1.1.1: a malformed token returned `500`**, an HTML page with a stack trace. `jwt.decode()` returns `null` for anything that isn't a JWT, and the middleware read `.exp` from it. Testing in Postman on 2026-10-27 found the same `500` for an API key without its `wck_` prefix, because the API treats any value without the prefix as a token. Since 1.1.1, a value that's neither an API key nor a token returns `401 "Invalid API key"` on the public endpoints [`auth_malformed_token`, `auth_no_scheme`, `key_without_prefix`, `key_without_bearer`] and `403 "Token is invalid"` on the internal ones, like any other bad token [`auth_malformed_token_internal`].
8. **Unknown IDs return `500`** instead of `404` [`follow_unknown_user`, `like_unknown_post`, `post_delete_again`], and invalid ObjectIds return `500` instead of `400` [`user_get_invalid_id`, `follow_invalid_id`, `post_get_invalid_id`, `post_delete_invalid_id`]. Planned for 2.0.0, because changing these statuses can break clients. Check IDs as finding 28 describes: Mongoose's own check lets 12-character strings through.

### Status codes

9. **Validation errors use `401`** on register [`register_missing_username` and 4 more] **and `403`** on create a post [`post_create_missing_userid`, `post_create_bad_image`]. They should be `400`.
10. **Invalid and expired tokens return `403`** [`auth_bad_signature`, `auth_expired`]. `401` is the usual status for authentication failures.
11. **"Already following" and "not following" return `403`** [`follow_again`, `unfollow_again`]. `409` fits a conflict like this better.
12. **Getting an unknown post returns `200` with `data: null`** [`post_get_unknown`] instead of `404`.
13. **Register and create a post return `200`**, not `201 Created`.

### Response shapes

14. **Unfollow returns plain JSON strings** for success and "not following" [`unfollow`, `unfollow_again`], unlike every other endpoint.
15. **Delete a post's `500` body has no `status` field**: it's `{}` or the raw database error [`post_delete_again`, `post_delete_invalid_id`].
16. **User fields vary by endpoint**: search leaves out empty `profilePicture` and `coverPicture` and includes `updatedAt` [`search_all`]; get the current user and get a user leave out `updatedAt` [`me`, `user_get`]. The spec documents this with two schemas: `User`, without `updatedAt`, and `UserWithUpdatedAt`, for search and login (since 2026-10-27).
17. **Fixed: a like without `userId` stored `null`** in `likes`. Since 1.1 it adds the caller's ID [`like_no_body`, `post_get_after_empty_like`].

### Validation

18. **Length limits aren't enforced**: a 600-character post is accepted [`post_create_long_desc`], and so are 2- and 30-character usernames [`register_username_short`, `register_username_long`]. The models set `min` and `max`, but Mongoose applies those only to numbers; strings need `minlength` and `maxlength`. The bio limit in [`api/models/User.js`](api/models/User.js) has the same problem: a 60-character bio is saved [`profile_update_long_bio`, `me_after_long_bio`]. *(Corrected 2026-10-24: this finding first stated the username and bio part without a test. The bio part was tested on 2026-10-28.)*
19. **Users can follow themselves** [`follow_self`]. The timeline code would then list their own posts twice; the test user had no posts, so this is untested [`timeline_self_follow`].

### API design

20. **One path, two meanings**: `GET /api/posts/{id}` takes a user ID, and `DELETE /api/posts/{id}` takes a post ID.
21. **Unusual paths**: `/api/users/{userId}/user`, `/api/posts/{postId}/single` and `/api/posts/timeline/all`. Follow and unfollow are `PUT` requests with the user ID in the body.
22. **No pagination** on search, a user's posts, or the timeline.
23. **The timeline isn't in date order overall**: the current user's posts come first, then each followed user's posts in turn [`timeline`].

### Added 2026-10-24, from the edge cases

24. **Usernames that differ only in case are different accounts**: `Alice` can register while `alice` exists [`register_username_case`], and login is case-sensitive [`login_username_case`]. That allows look-alike accounts.
25. **A body that isn't JSON is silently ignored**: a form-encoded register returns `401 Invalid username` [`register_form_encoded`], where `415 Unsupported Media Type` would explain the problem.
26. **An unsupported method returns Express's `404` page** [`wrong_method`], where `405 Method Not Allowed` is the usual status.

### Added 2026-10-28, from testing in Postman

27. **List a user's posts returns an empty list for a user who doesn't exist** [`posts_by_unknown_user`], so a mistyped ID looks like a user with no posts [`posts_by_user_no_posts`]. Get a user returns `404` for the same ID [`user_get_unknown`]. `Post.userId` is a plain string ([`api/models/Post.js:5-8`](api/models/Post.js#L5-L8)), so any value is a valid query, and the route never checks that the user exists ([`api/routes/posts.js:87-94`](api/routes/posts.js#L87-L94)). The spec documents this on the `id` parameter. Planned for 2.0.0, with finding 8: the empty list is documented, so returning `404` instead is a breaking change. Deleting an account doesn't delete its posts ([`api/routes/users.js:75-82`](api/routes/users.js#L75-L82)), so the change would also turn a deleted user's posts into `404` (from reading the code).

### Added 2026-10-29, from testing in Postman

28. **Any 12-character string counts as a valid ID.** Mongoose 5 reads a 12-character string as the 12 bytes of an ObjectId ([`bson` 1.1.6, `objectid.js:33` and `:348`](api/node_modules/bson/lib/bson/objectid.js#L33)). So a Postman variable missing a brace, such as `{{bobPostId}`, is treated as an ID that doesn't exist, not an invalid one. Delete a post returns `500 {}` instead of the database's `CastError` [`post_delete_12_char_id`], and get a user returns `404` [`user_get_12_char_id`]. The API only ever creates IDs of 24 hexadecimal characters, so a 12-character ID is always a client's mistake, and the error points away from it. The spec now explains this in its IDs section. Planned for 2.0.0, with finding 8: when invalid IDs return `400`, check them with `/^[0-9a-f]{24}$/i`, because `mongoose.isValidObjectId()` and `ObjectId.isValid()` both accept 12-character strings.

### Edge cases that behave correctly

- Special characters in a search term match only themselves: `a.i` and `(` both return no users [`search_special_dot`, `search_special_paren`].
- Unicode works in usernames and posts [`register_unicode`, `login_unicode`, `post_create_unicode`].
- A 5-character password, the shortest allowed, is accepted [`register_password_min`].
- An empty username or password is rejected [`register_username_empty`, `register_password_empty`]. An empty post text is accepted [`post_create_empty_desc`].
- A user with no follows or posts gets empty lists, not errors [`followers_empty`, `following_empty`, `timeline_empty`].

### Found by reading the code, outside the 15 endpoints

- **Update a post can't work** ([`api/routes/posts.js:29`](api/routes/posts.js#L29)): it looks the post up by the user's ID, finds nothing, and returns `500 {}`. It also stores the whole body.
- **Update the current user stores the whole body** after a few checks, and its validation errors use `403`.

Added 2026-10-25, found while redesigning the frontend:

- **You can only ever have one conversation** ([`api/routes/conversations.js:20-23`](api/routes/conversations.js#L20-L23)). Create a conversation looks for *any* conversation that includes you, `{ members: { $in: [req.user.id] } }`, and returns it if it exists. So after your first conversation, asking for one with someone else returns the old one, and the app would post into the wrong thread. The frontend now shows this limit instead of sending.
- **Get the latest message sorts by a field that doesn't exist** ([`api/routes/messages.js:31`](api/routes/messages.js#L31)): it sorts by `created_at`, but the model's timestamp is `createdAt`, so it returns whichever message MongoDB finds first.
- **The message endpoints don't check membership** ([`api/routes/messages.js:6-26`](api/routes/messages.js#L6-L26)). Any signed-in user can read any conversation's messages, and add a message with any `sender` to any conversation, because add a message stores the whole body.
- **Socket.io trusts the client and shares socket IDs** ([`api/index.js:77-92`](api/index.js#L77-L92)). `getUsers` sends every connected client the full list of online users with their socket IDs, and `sendMessage` relays whatever `senderId` the client claims.
- **One deleted account breaks the followers list** ([`api/routes/users.js:112-114`](api/routes/users.js#L112-L114)). Get followers looks up each follower; if one no longer exists, `follower.followers` throws and the whole request returns `500 "unable to get followers"`. Get following has the same pattern.

## API keys

Added 2026-10-26, in version 1.1. The keys cases are the `keys_*` and `key_*` cases in [`tests/cases.mjs`](tests/cases.mjs).

**What was tested**

| Behaviour | Cases |
|---|---|
| Creating a key returns `201` with the key, once; scopes come back in the order `read`, `write` | `keys_create`, `keys_create_read_only`, `keys_create_write_only`, `keys_create_bob` |
| A missing or too-long name, and unknown or empty scopes, return `400` | `keys_create_missing_name`, `keys_create_long_name`, `keys_create_bad_scope`, `keys_create_no_scopes` |
| Managing keys needs an access token: no header returns `401`, and an API key returns `403` | `keys_create_no_auth`, `keys_create_with_api_key`, `keys_list_no_auth`, `keys_list_with_api_key`, `keys_delete_no_auth`, `keys_delete_with_api_key` |
| Listing keys never returns the key itself, shows newest first, and shows only your own keys | `keys_list`, `keys_list_bob` |
| A key works on all 10 public endpoints and acts as its owner | `key_me`, `key_get_user`, `key_search`, `key_user_posts`, `key_timeline`, `key_create_post`, `key_delete_post`, `key_like`, `key_follow`, `key_unfollow`, `key_create_post_as_other_user`, `key_delete_other_users_post` |
| Scopes are enforced both ways: a read-only key can't write, and a write-only key can't read (`403`) | `key_create_post_read_only`, `key_delete_post_read_only`, `key_like_read_only`, `key_follow_read_only`, `key_write_only_read`, `key_write_only_me`, `key_write_only_get_user`, `key_write_only_user_posts`, `key_write_only_timeline` |
| Every public endpoint returns `401` without an `Authorization` header | `auth_missing` and the 9 `*_no_auth` cases added 2026-10-28 |
| Keys don't work on internal endpoints (`403`) | `key_on_internal_endpoint` |
| A wrong key returns `401`; a deleted key stops working at once (`401`) | `key_invalid`, `keys_delete`, `key_deleted` |
| A key without its `wck_` prefix, or without `Bearer` in front, returns `401` (since 1.1.1; `500` before) | `key_without_prefix`, `key_without_bearer` |
| You can't delete another user's key, an unknown key, or an invalid ID (`404` each time) | `keys_delete_other_user`, `keys_delete_unknown`, `keys_delete_invalid_id` |
| Using a key records `lastUsedAt` | `keys_list_after_delete` |

**A regression caught by the existing cases.** The first version of the key middleware was an `async` function. A malformed token then made `verifyToken` throw inside a promise, which Express 4 doesn't catch, so the server crashed instead of returning `500` [`auth_malformed_token`, `auth_no_scheme`]. The middleware now checks keys asynchronously but leaves the token path synchronous ([`api/routes/verifyToken.js`](api/routes/verifyToken.js)). Since 1.1.1 those two cases return `401` (finding 7), but the token path stays synchronous, so anything else that throws there still becomes a `500`, not a crash.

**The API keys page** in the app was checked in a browser against the real API by [`web/redesign/tools/check-api-keys.mjs`](web/redesign/tools/check-api-keys.mjs): 32 of 32 checks, including creating, using and deleting a key, axe accessibility checks, focus, and phone layout.

## Not tested yet

| Area | Why |
|---|---|
| The 8 undocumented endpoints and the Socket.io events | Planned for later phases |
| Self-follow with posts (finding 19) | Needs a self-follower who has posts |
| Token expiry after the real two days | Simulated instead, with a token whose `exp` has passed [`auth_expired`] |
| Behaviour with `NODE_ENV=production` | The tests run in development mode, so HTML errors include stack traces |
| Load, concurrency, and very large lists | Not part of documenting the API |
| Calling the API with a key from a browser on another origin | CORS blocks it for any credential (`cors_preflight_other_origin`); the docs tell developers to call the API from servers or scripts |
