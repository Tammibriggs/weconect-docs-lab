// Live test cases for the v1 API, run in order by tests/capture.mjs.
//
// Each case:
//   name     unique; also the capture's file name
//   group    the endpoint group, for the report
//   method, path
//            {placeholders} are filled from values saved by earlier cases
//   auth     "alice" | "bob" | "carol" (Bearer token), "expired", "badsig",
//            { raw: "<header value>" }, or omitted for no Authorization header
//   body     an object (sent as JSON) or a string (sent as-is as JSON)
//   headers  extra request headers
//   save     { variable: "path.in.response" } for later cases
//   expect   the status v1 is expected to return; a mismatch is reported
//   note     what the case shows
//
// The order matters: later cases depend on users, follows and posts made earlier.

const NO_SUCH_ID = "000000000000000000000000"; // a valid ObjectId that matches nothing
const LONG_TEXT = "x".repeat(600);

export const cases = [
  // ─── Routing and CORS ───────────────────────────────────────────
  { name: "unknown_route", group: "General", method: "GET", path: "/api/nope", expect: 404,
    note: "Express's default 404 page for a route that doesn't exist" },
  { name: "cors_preflight_other_origin", group: "General", method: "OPTIONS", path: "/api/auth/login",
    headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" }, expect: 204,
    note: "A browser preflight from an origin other than ALLOWED_HOST" },

  // ─── Register ───────────────────────────────────────────────────
  { name: "register_alice", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "alice", password: "secret1", password1: "secret1" }, expect: 200 },
  { name: "register_bob", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "bob", password: "secret2", password1: "secret2" }, expect: 200 },
  { name: "register_carol", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "carol", password: "secret3", password1: "secret3" }, expect: 200 },
  { name: "register_duplicate", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "alice", password: "secret1", password1: "secret1" }, expect: 409 },
  { name: "register_missing_username", group: "Register", method: "POST", path: "/api/auth/register",
    body: { password: "secret1", password1: "secret1" }, expect: 401 },
  { name: "register_username_not_string", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: 12345, password: "secret1", password1: "secret1" }, expect: 401 },
  { name: "register_password_mismatch", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "dave", password: "secret1", password1: "secret9" }, expect: 401 },
  { name: "register_password_short", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "dave", password: "abcd", password1: "abcd" }, expect: 401,
    note: "Passwords need at least 5 characters" },
  { name: "register_missing_password1", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "dave", password: "secret1" }, expect: 401 },
  { name: "register_invalid_json", group: "Register", method: "POST", path: "/api/auth/register",
    body: '{"username": "dave",', expect: 400, note: "A body that isn't valid JSON" },
  { name: "register_extra_fields", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "dave", password: "secret4", password1: "secret4", isAdmin: true }, expect: 200,
    note: "isAdmin in the body should be ignored" },

  // ─── Log in ─────────────────────────────────────────────────────
  { name: "login_alice", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "alice", password: "secret1" }, expect: 200,
    save: { aliceId: "data._id", aliceToken: "data.accessToken" } },
  { name: "login_bob", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "bob", password: "secret2" }, expect: 200,
    save: { bobId: "data._id", bobToken: "data.accessToken" } },
  { name: "login_carol", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "carol", password: "secret3" }, expect: 200,
    save: { carolId: "data._id", carolToken: "data.accessToken" } },
  { name: "login_dave", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "dave", password: "secret4" }, expect: 200,
    note: "Checks whether isAdmin from register_extra_fields was stored" },
  { name: "login_unknown_user", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "nobody", password: "secret1" }, expect: 404 },
  { name: "login_wrong_password", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "alice", password: "wrong-password" }, expect: 400 },
  { name: "login_empty_body", group: "Log in", method: "POST", path: "/api/auth/login",
    body: {}, expect: 404 },

  // ─── Authentication, on GET /api/users ──────────────────────────
  { name: "me", group: "Current user", method: "GET", path: "/api/users", auth: "alice", expect: 200 },
  { name: "auth_missing", group: "Authentication", method: "GET", path: "/api/users", expect: 401 },
  { name: "auth_malformed_token", group: "Authentication", method: "GET", path: "/api/users",
    auth: { raw: "Bearer not-a-jwt" }, expect: 401, note: "Neither a key nor a token; 500 before 1.1.1 (finding 7)" },
  { name: "auth_bad_signature", group: "Authentication", method: "GET", path: "/api/users",
    auth: "badsig", expect: 403, note: "A JWT signed with a different secret" },
  { name: "auth_expired", group: "Authentication", method: "GET", path: "/api/users",
    auth: "expired", expect: 403, note: "A JWT signed with the right secret whose exp has passed" },
  { name: "auth_other_scheme", group: "Authentication", method: "GET", path: "/api/users",
    auth: { raw: "Token {aliceToken}" }, expect: 200, note: "The scheme word isn't checked" },
  { name: "auth_no_scheme", group: "Authentication", method: "GET", path: "/api/users",
    auth: { raw: "{aliceToken}" }, expect: 401, note: "A token with no scheme word in front; 500 before 1.1.1" },
  { name: "auth_malformed_token_internal", group: "Authentication", method: "GET", path: "/api/users/followers",
    auth: { raw: "Bearer not-a-jwt" }, expect: 403, note: "An internal endpoint: treated as a bad token; 500 before 1.1.1" },

  // ─── Users ──────────────────────────────────────────────────────
  { name: "user_get", group: "Get a user", method: "GET", path: "/api/users/{bobId}/user", auth: "alice", expect: 200 },
  { name: "user_get_unknown", group: "Get a user", method: "GET", path: `/api/users/${NO_SUCH_ID}/user`, auth: "alice", expect: 404 },
  { name: "user_get_invalid_id", group: "Get a user", method: "GET", path: "/api/users/abc/user", auth: "alice", expect: 500 },
  { name: "search_all", group: "Search users", method: "GET", path: "/api/users/search", auth: "alice", expect: 200,
    note: "No search term returns every user. Since 2026-10-26, without passwords (finding 1 fixed)" },
  { name: "search_term", group: "Search users", method: "GET", path: "/api/users/search?search=ali", auth: "alice", expect: 200 },
  { name: "search_case_insensitive", group: "Search users", method: "GET", path: "/api/users/search?search=BOB", auth: "alice", expect: 200 },
  { name: "search_no_match", group: "Search users", method: "GET", path: "/api/users/search?search=zzz", auth: "alice", expect: 200 },

  // ─── Follow ─────────────────────────────────────────────────────
  { name: "follow", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "alice",
    body: { userId: "{bobId}" }, expect: 200, note: "alice follows bob" },
  { name: "follow_again", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "alice",
    body: { userId: "{bobId}" }, expect: 403 },
  { name: "follow_missing_userid", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "alice",
    body: {}, expect: 400 },
  { name: "follow_unknown_user", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "alice",
    body: { userId: NO_SUCH_ID }, expect: 500 },
  { name: "follow_invalid_id", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "alice",
    body: { userId: "abc" }, expect: 500 },
  { name: "follow_carol_to_alice", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "carol",
    body: { userId: "{aliceId}" }, expect: 200 },
  { name: "follow_bob_to_alice", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "bob",
    body: { userId: "{aliceId}" }, expect: 200 },
  { name: "follow_self", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "carol",
    body: { userId: "{carolId}" }, expect: 200, note: "Nothing stops a user from following themselves" },
  { name: "followers", group: "Followers", method: "GET", path: "/api/users/followers", auth: "alice", expect: 200,
    note: "carol and bob follow alice; alice follows bob back" },
  { name: "following", group: "Following", method: "GET", path: "/api/users/following", auth: "alice", expect: 200 },

  // ─── Posts ──────────────────────────────────────────────────────
  { name: "post_create", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", desc: "Hello from Alice" }, expect: 200, save: { postA: "data._id" } },
  { name: "post_create_with_image", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", desc: "A photo", img: { url: "https://example.com/photo.jpg", filename: "photo.jpg" } },
    expect: 200, save: { postA2: "data._id" } },
  { name: "post_create_bob", group: "Create a post", method: "POST", path: "/api/posts", auth: "bob",
    body: { userId: "{bobId}", desc: "Hello from Bob" }, expect: 200, save: { postB: "data._id" } },
  { name: "post_create_missing_userid", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { desc: "No user ID" }, expect: 403 },
  { name: "post_create_for_other_user", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{bobId}", desc: "Posting as bob" }, expect: 403 },
  { name: "post_create_bad_image", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", img: { url: "https://example.com/photo.jpg" } }, expect: 403 },
  { name: "post_create_long_desc", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", desc: LONG_TEXT }, expect: 200, note: "The model says max 500; is it enforced?" },
  { name: "post_create_preset_likes", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", desc: "Already liked", likes: ["{carolId}"] }, expect: 200,
    note: "Can the client set fields it shouldn't, such as likes?" },
  { name: "post_get", group: "Get a post", method: "GET", path: "/api/posts/{postA}/single", auth: "bob", expect: 200 },
  { name: "post_get_unknown", group: "Get a post", method: "GET", path: `/api/posts/${NO_SUCH_ID}/single`, auth: "bob", expect: 200 },
  { name: "post_get_invalid_id", group: "Get a post", method: "GET", path: "/api/posts/abc/single", auth: "bob", expect: 500 },
  { name: "posts_by_user", group: "List a user's posts", method: "GET", path: "/api/posts/{bobId}", auth: "alice", expect: 200 },
  { name: "posts_by_user_with_image", group: "List a user's posts", method: "GET", path: "/api/posts/{aliceId}", auth: "alice",
    expect: 200, note: "Added 2026-10-28: alice's posts include one with an image" },
  { name: "posts_by_unknown_user", group: "List a user's posts", method: "GET", path: "/api/posts/nobody", auth: "alice", expect: 200 },
  { name: "timeline", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", auth: "alice", expect: 200,
    note: "alice's posts, then posts from the users she follows (bob)" },
  { name: "timeline_self_follow", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", auth: "carol", expect: 200,
    note: "carol follows alice and herself" },

  // ─── Likes ──────────────────────────────────────────────────────
  { name: "like", group: "Like a post", method: "PUT", path: "/api/posts/{postA}/like", auth: "bob",
    body: { userId: "{bobId}" }, expect: 200 },
  { name: "like_on_behalf", group: "Like a post", method: "PUT", path: "/api/posts/{postA}/like", auth: "alice",
    body: { userId: "{carolId}" }, expect: 200,
    note: "alice's token, carol's user ID. Since 2026-10-26 the like is alice's own (finding 2 fixed)" },
  { name: "like_no_body", group: "Like a post", method: "PUT", path: "/api/posts/{postB}/like", auth: "alice",
    body: {}, expect: 200, note: "Since 2026-10-26 this adds alice's ID; before, it added null (finding 17 fixed)" },
  { name: "like_unknown_post", group: "Like a post", method: "PUT", path: `/api/posts/${NO_SUCH_ID}/like`, auth: "bob",
    body: { userId: "{bobId}" }, expect: 500 },
  { name: "post_get_after_likes", group: "Get a post", method: "GET", path: "/api/posts/{postA}/single", auth: "bob", expect: 200 },
  { name: "post_get_after_empty_like", group: "Get a post", method: "GET", path: "/api/posts/{postB}/single", auth: "bob", expect: 200 },

  // ─── Unfollow ───────────────────────────────────────────────────
  { name: "unfollow", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", auth: "alice",
    body: { userId: "{bobId}" }, expect: 200 },
  { name: "unfollow_again", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", auth: "alice",
    body: { userId: "{bobId}" }, expect: 403 },
  { name: "unfollow_missing_userid", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", auth: "alice",
    body: {}, expect: 400 },

  // ─── Delete a post ──────────────────────────────────────────────
  { name: "post_delete_not_owner", group: "Delete a post", method: "DELETE", path: "/api/posts/{postA}", auth: "bob", expect: 403 },
  { name: "post_delete", group: "Delete a post", method: "DELETE", path: "/api/posts/{postA2}", auth: "alice", expect: 200 },
  { name: "post_delete_again", group: "Delete a post", method: "DELETE", path: "/api/posts/{postA2}", auth: "alice", expect: 500 },
  { name: "post_delete_invalid_id", group: "Delete a post", method: "DELETE", path: "/api/posts/abc", auth: "alice", expect: 500 },

  // ─── API keys, added 2026-10-26 ──────────────────────────────────
  // Managing keys is internal and needs an access token from logging in.
  // The 10 public endpoints accept a key with the right scope.
  { name: "keys_create", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { name: "My bot", scopes: ["read", "write"] }, expect: 201, save: { aliceKey: "data.key", aliceKeyId: "data.id" } },
  { name: "keys_create_read_only", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { name: "Dashboard", scopes: ["read"] }, expect: 201, save: { aliceReadKey: "data.key", aliceReadKeyId: "data.id" } },
  { name: "keys_create_bob", group: "Create an API key", method: "POST", path: "/api/keys", auth: "bob",
    body: { name: "Bob's script", scopes: ["write", "read"] }, expect: 201, save: { bobKey: "data.key" },
    note: "Scopes are returned in a fixed order: read, write" },
  { name: "keys_create_write_only", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { name: "Poster", scopes: ["write"] }, expect: 201, save: { aliceWriteKey: "data.key" } },
  { name: "keys_create_missing_name", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { scopes: ["read"] }, expect: 400 },
  { name: "keys_create_long_name", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { name: "n".repeat(51), scopes: ["read"] }, expect: 400, note: "Names can be up to 50 characters" },
  { name: "keys_create_bad_scope", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { name: "Admin", scopes: ["admin"] }, expect: 400 },
  { name: "keys_create_no_scopes", group: "Create an API key", method: "POST", path: "/api/keys", auth: "alice",
    body: { name: "Nothing", scopes: [] }, expect: 400 },
  { name: "keys_create_no_auth", group: "Create an API key", method: "POST", path: "/api/keys",
    body: { name: "Anonymous", scopes: ["read"] }, expect: 401 },
  { name: "keys_create_with_api_key", group: "Create an API key", method: "POST", path: "/api/keys",
    auth: { raw: "Bearer {aliceKey}" }, body: { name: "Made by a key", scopes: ["read"] }, expect: 403,
    note: "A key can't create keys, so a leaked key can't make more" },
  { name: "keys_list", group: "List API keys", method: "GET", path: "/api/keys", auth: "alice", expect: 200,
    note: "Newest first; the key itself is never returned again" },

  { name: "key_me", group: "Current user", method: "GET", path: "/api/users", auth: { raw: "Bearer {aliceKey}" }, expect: 200 },
  { name: "key_read_only_me", group: "Current user", method: "GET", path: "/api/users", auth: { raw: "Bearer {aliceReadKey}" }, expect: 200 },
  { name: "key_get_user", group: "Get a user", method: "GET", path: "/api/users/{bobId}/user",
    auth: { raw: "Bearer {aliceReadKey}" }, expect: 200 },
  { name: "key_search", group: "Search users", method: "GET", path: "/api/users/search?search=bob",
    auth: { raw: "Bearer {aliceReadKey}" }, expect: 200, note: "No password in the results (finding 1 fixed)" },
  { name: "key_user_posts", group: "List a user's posts", method: "GET", path: "/api/posts/{bobId}",
    auth: { raw: "Bearer {aliceReadKey}" }, expect: 200 },
  { name: "key_timeline", group: "Timeline", method: "GET", path: "/api/posts/timeline/all",
    auth: { raw: "Bearer {aliceReadKey}" }, expect: 200 },
  { name: "key_create_post", group: "Create a post", method: "POST", path: "/api/posts", auth: { raw: "Bearer {aliceKey}" },
    body: { userId: "{aliceId}", desc: "Posted with an API key" }, expect: 200, save: { keyPost: "data._id" } },
  { name: "key_create_post_read_only", group: "Create a post", method: "POST", path: "/api/posts", auth: { raw: "Bearer {aliceReadKey}" },
    body: { userId: "{aliceId}", desc: "Not allowed" }, expect: 403, note: "A read-only key can't call write endpoints" },
  { name: "key_create_post_as_other_user", group: "Create a post", method: "POST", path: "/api/posts", auth: { raw: "Bearer {bobKey}" },
    body: { userId: "{aliceId}", desc: "Posting as alice" }, expect: 403, note: "A key acts as its owner, bob" },
  { name: "key_write_only_read", group: "Search users", method: "GET", path: "/api/users/search?search=bob",
    auth: { raw: "Bearer {aliceWriteKey}" }, expect: 403, note: "A write-only key can't call read endpoints" },
  { name: "key_like", group: "Like a post", method: "PUT", path: "/api/posts/{keyPost}/like", auth: { raw: "Bearer {aliceKey}" },
    body: {}, expect: 200 },
  { name: "key_like_read_only", group: "Like a post", method: "PUT", path: "/api/posts/{keyPost}/like", auth: { raw: "Bearer {aliceReadKey}" },
    body: {}, expect: 403 },
  { name: "key_delete_post_read_only", group: "Delete a post", method: "DELETE", path: "/api/posts/{keyPost}",
    auth: { raw: "Bearer {aliceReadKey}" }, expect: 403 },
  { name: "key_delete_other_users_post", group: "Delete a post", method: "DELETE", path: "/api/posts/{postA}",
    auth: { raw: "Bearer {bobKey}" }, expect: 403, note: "bob's key can't delete alice's post" },
  { name: "key_delete_post", group: "Delete a post", method: "DELETE", path: "/api/posts/{keyPost}",
    auth: { raw: "Bearer {aliceKey}" }, expect: 200 },
  { name: "key_follow", group: "Follow", method: "PUT", path: "/api/users/follow", auth: { raw: "Bearer {aliceKey}" },
    body: { userId: "{carolId}" }, expect: 200 },
  { name: "key_follow_read_only", group: "Follow", method: "PUT", path: "/api/users/follow", auth: { raw: "Bearer {aliceReadKey}" },
    body: { userId: "{carolId}" }, expect: 403 },
  { name: "key_unfollow_read_only", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", auth: { raw: "Bearer {aliceReadKey}" },
    body: { userId: "{carolId}" }, expect: 403, note: "Added 2026-10-28: an error object, unlike unfollow's other 403" },
  { name: "key_unfollow", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", auth: { raw: "Bearer {aliceKey}" },
    body: { userId: "{carolId}" }, expect: 200 },
  { name: "key_on_internal_endpoint", group: "API keys", method: "GET", path: "/api/users/followers",
    auth: { raw: "Bearer {aliceKey}" }, expect: 403, note: "Keys work only on the 10 public endpoints" },
  { name: "key_invalid", group: "API keys", method: "GET", path: "/api/users",
    auth: { raw: "Bearer wck_thisIsNotARealKey000" }, expect: 401 },
  { name: "key_without_prefix", group: "API keys", method: "GET", path: "/api/users",
    auth: { raw: "Bearer 2434143" }, expect: 401, note: "Found in Postman: 500 before 1.1.1" },
  { name: "key_without_bearer", group: "API keys", method: "GET", path: "/api/users",
    auth: { raw: "{aliceKey}" }, expect: 401, note: "A real key, but no \"Bearer \" in front" },

  { name: "keys_delete_other_user", group: "Delete an API key", method: "DELETE", path: "/api/keys/{aliceReadKeyId}", auth: "bob",
    expect: 404, note: "bob can't delete alice's key" },
  { name: "keys_delete_unknown", group: "Delete an API key", method: "DELETE", path: `/api/keys/${NO_SUCH_ID}`, auth: "alice", expect: 404 },
  { name: "keys_delete_invalid_id", group: "Delete an API key", method: "DELETE", path: "/api/keys/abc", auth: "alice", expect: 404 },
  { name: "keys_delete", group: "Delete an API key", method: "DELETE", path: "/api/keys/{aliceReadKeyId}", auth: "alice", expect: 200 },
  { name: "key_deleted", group: "API keys", method: "GET", path: "/api/users", auth: { raw: "Bearer {aliceReadKey}" }, expect: 401,
    note: "A deleted key stops working at once" },
  { name: "keys_list_after_delete", group: "List API keys", method: "GET", path: "/api/keys", auth: "alice", expect: 200,
    note: "One key left; lastUsedAt is set because the key was used above" },
  { name: "keys_list_bob", group: "List API keys", method: "GET", path: "/api/keys", auth: "bob", expect: 200,
    note: "Each user sees only their own keys" },

  // ─── Response coverage, added 2026-10-28 ─────────────────────────
  // One case for each documented response no other case produced, so that
  // npm run test:coverage finds every documented status in a capture.
  // Each is rejected before it changes anything.

  // No Authorization header
  { name: "user_get_no_auth", group: "Get a user", method: "GET", path: "/api/users/{bobId}/user", expect: 401 },
  { name: "search_no_auth", group: "Search users", method: "GET", path: "/api/users/search?search=bob", expect: 401 },
  { name: "follow_no_auth", group: "Follow", method: "PUT", path: "/api/users/follow", body: { userId: "{bobId}" }, expect: 401 },
  { name: "unfollow_no_auth", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", body: { userId: "{bobId}" }, expect: 401 },
  { name: "post_create_no_auth", group: "Create a post", method: "POST", path: "/api/posts",
    body: { userId: "{aliceId}", desc: "No key" }, expect: 401 },
  { name: "posts_by_user_no_auth", group: "List a user's posts", method: "GET", path: "/api/posts/{bobId}", expect: 401 },
  { name: "post_delete_no_auth", group: "Delete a post", method: "DELETE", path: "/api/posts/{postA}", expect: 401 },
  { name: "timeline_no_auth", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", expect: 401 },
  { name: "like_no_auth", group: "Like a post", method: "PUT", path: "/api/posts/{postB}/like", body: {}, expect: 401 },
  { name: "keys_list_no_auth", group: "List API keys", method: "GET", path: "/api/keys", expect: 401 },
  { name: "keys_delete_no_auth", group: "Delete an API key", method: "DELETE", path: "/api/keys/{aliceKeyId}", expect: 401 },

  // A write-only key on the read endpoints: 403, naming the 'read' scope
  { name: "key_write_only_me", group: "Current user", method: "GET", path: "/api/users",
    auth: { raw: "Bearer {aliceWriteKey}" }, expect: 403 },
  { name: "key_write_only_get_user", group: "Get a user", method: "GET", path: "/api/users/{bobId}/user",
    auth: { raw: "Bearer {aliceWriteKey}" }, expect: 403 },
  { name: "key_write_only_user_posts", group: "List a user's posts", method: "GET", path: "/api/posts/{bobId}",
    auth: { raw: "Bearer {aliceWriteKey}" }, expect: 403 },
  { name: "key_write_only_timeline", group: "Timeline", method: "GET", path: "/api/posts/timeline/all",
    auth: { raw: "Bearer {aliceWriteKey}" }, expect: 403 },

  // An API key on the internal endpoints for managing keys
  { name: "keys_list_with_api_key", group: "List API keys", method: "GET", path: "/api/keys",
    auth: { raw: "Bearer {aliceKey}" }, expect: 403 },
  { name: "keys_delete_with_api_key", group: "Delete an API key", method: "DELETE", path: "/api/keys/{aliceKeyId}",
    auth: { raw: "Bearer {aliceKey}" }, expect: 403, note: "The key isn't deleted" },

  // An expired access token: 403 with "expired": true, on every 403 that documents it
  { name: "user_get_expired_token", group: "Get a user", method: "GET", path: "/api/users/{bobId}/user", auth: "expired", expect: 403 },
  { name: "search_expired_token", group: "Search users", method: "GET", path: "/api/users/search?search=bob", auth: "expired", expect: 403 },
  { name: "follow_expired_token", group: "Follow", method: "PUT", path: "/api/users/follow", auth: "expired",
    body: { userId: "{bobId}" }, expect: 403 },
  { name: "unfollow_expired_token", group: "Unfollow", method: "PUT", path: "/api/users/unfollow", auth: "expired",
    body: { userId: "{bobId}" }, expect: 403 },
  { name: "post_create_expired_token", group: "Create a post", method: "POST", path: "/api/posts", auth: "expired",
    body: { userId: "{aliceId}", desc: "Too late" }, expect: 403 },
  { name: "posts_by_user_expired_token", group: "List a user's posts", method: "GET", path: "/api/posts/{bobId}", auth: "expired", expect: 403 },
  { name: "post_delete_expired_token", group: "Delete a post", method: "DELETE", path: "/api/posts/{postA}", auth: "expired", expect: 403 },
  { name: "timeline_expired_token", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", auth: "expired", expect: 403 },
  { name: "like_expired_token", group: "Like a post", method: "PUT", path: "/api/posts/{postB}/like", auth: "expired", body: {}, expect: 403 },
  { name: "keys_create_expired_token", group: "Create an API key", method: "POST", path: "/api/keys", auth: "expired",
    body: { name: "Too late", scopes: ["read"] }, expect: 403 },
  { name: "keys_list_expired_token", group: "List API keys", method: "GET", path: "/api/keys", auth: "expired", expect: 403 },
  { name: "keys_delete_expired_token", group: "Delete an API key", method: "DELETE", path: "/api/keys/{aliceKeyId}", auth: "expired", expect: 403 },

  // ─── Edge cases, added 2026-10-24 ───────────────────────────────
  // After the main flow, so the users they add don't change earlier results.

  // Search terms are escaped before they become a regular expression
  { name: "search_special_dot", group: "Search users", method: "GET", path: "/api/users/search?search=a.i", auth: "alice",
    expect: 200, note: "As a regex, a.i would match alice; escaped, it matches nobody" },
  { name: "search_special_paren", group: "Search users", method: "GET", path: "/api/users/search?search=(", auth: "alice",
    expect: 200, note: "An unescaped ( would be an invalid regex and a 500" },

  // Unicode
  { name: "register_unicode", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "zoë", password: "secret5", password1: "secret5" }, expect: 200 },
  { name: "login_unicode", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "zoë", password: "secret5" }, expect: 200 },
  { name: "post_create_unicode", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", desc: "Hello 👋 from Alice, café" }, expect: 200 },

  // Exact limits and empty strings
  { name: "register_password_min", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "erin", password: "abcde", password1: "abcde" }, expect: 200,
    note: "Exactly 5 characters, the shortest allowed" },
  { name: "login_erin", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "erin", password: "abcde" }, expect: 200,
    save: { erinId: "data._id", erinToken: "data.accessToken" } },
  { name: "register_password_empty", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "frank", password: "", password1: "" }, expect: 401 },
  { name: "register_username_empty", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "", password: "secret6", password1: "secret6" }, expect: 401 },
  { name: "register_username_short", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "ab", password: "secret6", password1: "secret6" }, expect: 200,
    note: "The model says min 3; Mongoose's min applies only to numbers" },
  { name: "register_username_long", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "u".repeat(30), password: "secret6", password1: "secret6" }, expect: 200,
    note: "The model says max 20; Mongoose's max applies only to numbers" },
  { name: "post_create_empty_desc", group: "Create a post", method: "POST", path: "/api/posts", auth: "alice",
    body: { userId: "{aliceId}", desc: "" }, expect: 200 },

  // Username case
  { name: "register_username_case", group: "Register", method: "POST", path: "/api/auth/register",
    body: { username: "Alice", password: "secret7", password1: "secret7" }, expect: 200,
    note: "alice already exists; the unique index is case-sensitive" },
  { name: "login_username_case", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "ALICE", password: "secret1" }, expect: 404 },

  // Wrong content type and wrong method
  { name: "register_form_encoded", group: "Register", method: "POST", path: "/api/auth/register",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "username=gina&password=secret8&password1=secret8", expect: 401,
    note: "Only JSON bodies are parsed, so the API sees no username" },
  { name: "wrong_method", group: "General", method: "DELETE", path: "/api/auth/login", expect: 404,
    note: "Express answers an unsupported method with its 404 page, not 405" },

  // Empty lists: erin follows nobody, has no followers, and has no posts
  { name: "followers_empty", group: "Followers", method: "GET", path: "/api/users/followers", auth: "erin", expect: 200 },
  { name: "following_empty", group: "Following", method: "GET", path: "/api/users/following", auth: "erin", expect: 200 },
  { name: "timeline_empty", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", auth: "erin", expect: 200 },

  // ─── A saved profile, added 2026-10-28 ──────────────────────────
  // bio and the pictures' url and filename appear only once a user saves their
  // profile, as the app's Edit profile dialog does. Update the current user is
  // out of scope; it's used here only to save erin's profile. erin follows
  // nobody, so her profile makes a clean example.
  { name: "profile_update", group: "Update the current user", method: "PUT", path: "/api/users", auth: "erin",
    body: { username: "erin", bio: "Coffee and code",
      profilePicture: { url: "https://example.com/erin.jpg", filename: "erin.jpg" },
      coverPicture: { url: "https://example.com/erin-cover.jpg", filename: "erin-cover.jpg" } }, expect: 200 },
  { name: "me_with_profile", group: "Current user", method: "GET", path: "/api/users", auth: "erin", expect: 200 },
  { name: "user_get_with_profile", group: "Get a user", method: "GET", path: "/api/users/{erinId}/user",
    auth: { raw: "Bearer {aliceKey}" }, expect: 200 },
  { name: "search_with_profile", group: "Search users", method: "GET", path: "/api/users/search?search=erin",
    auth: { raw: "Bearer {aliceKey}" }, expect: 200 },
  { name: "login_with_profile", group: "Log in", method: "POST", path: "/api/auth/login",
    body: { username: "erin", password: "abcde" }, expect: 200 },
  { name: "profile_update_long_bio", group: "Update the current user", method: "PUT", path: "/api/users", auth: "erin",
    body: { username: "erin", bio: LONG_TEXT.slice(0, 60) }, expect: 200,
    note: "The model's 50-character limit isn't enforced (finding 18)" },
  { name: "me_after_long_bio", group: "Current user", method: "GET", path: "/api/users", auth: "erin", expect: 200,
    note: "The 60-character bio was saved" },

  // ─── Unlike: last, because the code suggests it crashes the server ──
  { name: "unlike", group: "Like a post", method: "PUT", path: "/api/posts/{postA}/like", auth: "bob",
    body: { userId: "{bobId}" }, expect: 200, note: "Liking a second time removes the like" },
  { name: "after_unlike", group: "Like a post", method: "GET", path: "/api/users", auth: "alice", expect: "ECONNREFUSED",
    noRestart: true, note: "Unlike sends 200, then the server crashes (ERR_HTTP_HEADERS_SENT), so this request is refused" },
  { name: "post_get_after_unlike", group: "Get a post", method: "GET", path: "/api/posts/{postA}/single", auth: "bob", expect: 200,
    note: "After a restart, if one was needed: was the like removed?" },
];
