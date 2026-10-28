# weConect API changelog

Changes to the weConect API, newest first. Versions follow [semantic versioning](https://semver.org/): a minor version adds features without breaking existing clients, and a major version can break them. Each change links to its evidence in [`TESTING.md`](TESTING.md).

## 1.1.1: 2026-10-27

### Fixed

- **A value that isn't an API key returns `401`, not `500`.** A key without its `wck_` prefix, a key without `Bearer` in front, or anything else that's neither an API key nor an access token now returns `401` with `"Invalid API key"`, like any other wrong key. Before, it returned `500` with an HTML error page that included a stack trace (finding 7). The internal endpoints return `403` with `"Token is invalid"` for it, as for any other bad token.

### Documentation

- **Get the current user** and **Get a user** no longer show `updatedAt` in their response schema, because they never return it (finding 16). **Search users** returns it, so its results now use a new `UserWithUpdatedAt` schema, where `updatedAt` is required. These endpoints behave as before.

## 1.1.0: 2026-10-26

### Added

- **API keys.** Developers can now call the API with an API key instead of a login token. Send it as `Authorization: Bearer wck_...`. Create and delete keys on the new **API keys** page in the app: open your profile and select **API keys**.
- **Scopes.** Each key has the `read` scope, the `write` scope, or both. Read endpoints need `read`; follow, unfollow, create a post, delete a post, and like need `write`. A key without the scope gets `403`.
- New authentication errors for keys: `401 Invalid API key` for a wrong or deleted key, and `403` for a missing scope.

### Fixed

- **Search users no longer returns passwords.** Each user in the results used to include their encrypted password (finding 1). Removing a response field is normally a breaking change; this one leaked secrets, so it ships as a fix.
- **Likes are always the caller's own.** Like or unlike a post used the `userId` in the body, so a client could like posts on behalf of any user (finding 2). It now ignores `userId`, which is deprecated.
- A like without `userId` no longer adds `null` to `likes` (finding 17).

### Changed

- The request body of **Like or unlike a post** is now optional.

### Documentation

- The public reference covers the 10 endpoints that accept API keys. Register, log in, and managing API keys are internal: they're in the full spec, marked `x-internal: true`, but not in the public one.
- List followers, list followed users, and get a post were removed from the docs. They still work as before.

Login tokens work on every endpoint as before, so the app's existing features needed no changes. A client that still sends `userId` when liking gets the same response, but the like is now always its own.

## 1.0.0: 2026-10-22

The first documented version: 15 endpoints, documented as they behaved, with 23 findings in `TESTING.md`.
