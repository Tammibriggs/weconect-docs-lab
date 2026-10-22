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
    auth: { raw: "Bearer not-a-jwt" }, expect: 500, note: "jwt.decode() returns null for a non-JWT" },
  { name: "auth_bad_signature", group: "Authentication", method: "GET", path: "/api/users",
    auth: "badsig", expect: 403, note: "A JWT signed with a different secret" },
  { name: "auth_expired", group: "Authentication", method: "GET", path: "/api/users",
    auth: "expired", expect: 403, note: "A JWT signed with the right secret whose exp has passed" },
  { name: "auth_other_scheme", group: "Authentication", method: "GET", path: "/api/users",
    auth: { raw: "Token {aliceToken}" }, expect: 200, note: "The scheme word isn't checked" },
  { name: "auth_no_scheme", group: "Authentication", method: "GET", path: "/api/users",
    auth: { raw: "{aliceToken}" }, expect: 500, note: "A token with no scheme word in front" },

  // ─── Users ──────────────────────────────────────────────────────
  { name: "user_get", group: "Get a user", method: "GET", path: "/api/users/{bobId}/user", auth: "alice", expect: 200 },
  { name: "user_get_unknown", group: "Get a user", method: "GET", path: `/api/users/${NO_SUCH_ID}/user`, auth: "alice", expect: 404 },
  { name: "user_get_invalid_id", group: "Get a user", method: "GET", path: "/api/users/abc/user", auth: "alice", expect: 500 },
  { name: "search_all", group: "Search users", method: "GET", path: "/api/users/search", auth: "alice", expect: 200,
    note: "No search term returns every user" },
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
  { name: "posts_by_unknown_user", group: "List a user's posts", method: "GET", path: "/api/posts/nobody", auth: "alice", expect: 200 },
  { name: "timeline", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", auth: "alice", expect: 200,
    note: "alice's posts, then posts from the users she follows (bob)" },
  { name: "timeline_self_follow", group: "Timeline", method: "GET", path: "/api/posts/timeline/all", auth: "carol", expect: 200,
    note: "carol follows alice and herself" },

  // ─── Likes ──────────────────────────────────────────────────────
  { name: "like", group: "Like a post", method: "PUT", path: "/api/posts/{postA}/like", auth: "bob",
    body: { userId: "{bobId}" }, expect: 200 },
  { name: "like_on_behalf", group: "Like a post", method: "PUT", path: "/api/posts/{postA}/like", auth: "alice",
    body: { userId: "{carolId}" }, expect: 200, note: "alice's token, carol's user ID" },
  { name: "like_no_body", group: "Like a post", method: "PUT", path: "/api/posts/{postB}/like", auth: "alice",
    body: {}, expect: 200 },
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

  // ─── Unlike: last, because the code suggests it crashes the server ──
  { name: "unlike", group: "Like a post", method: "PUT", path: "/api/posts/{postA}/like", auth: "bob",
    body: { userId: "{bobId}" }, expect: 200, note: "Liking a second time removes the like" },
  { name: "after_unlike", group: "Like a post", method: "GET", path: "/api/users", auth: "alice", expect: "ECONNREFUSED",
    noRestart: true, note: "Unlike sends 200, then the server crashes (ERR_HTTP_HEADERS_SENT), so this request is refused" },
  { name: "post_get_after_unlike", group: "Get a post", method: "GET", path: "/api/posts/{postA}/single", auth: "bob", expect: 200,
    note: "After a restart, if one was needed: was the like removed?" },
];
