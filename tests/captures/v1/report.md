# Capture run 2026-10-22T14-49-48

75 cases, 75 as expected, 0 different, 1 server restart(s).

| Case | Group | Expected | Got | Note |
|---|---|---|---|---|
| unknown_route | General | 404 | 404 | Express's default 404 page for a route that doesn't exist |
| cors_preflight_other_origin | General | 204 | 204 | A browser preflight from an origin other than ALLOWED_HOST |
| register_alice | Register | 200 | 200 |  |
| register_bob | Register | 200 | 200 |  |
| register_carol | Register | 200 | 200 |  |
| register_duplicate | Register | 409 | 409 |  |
| register_missing_username | Register | 401 | 401 |  |
| register_username_not_string | Register | 401 | 401 |  |
| register_password_mismatch | Register | 401 | 401 |  |
| register_password_short | Register | 401 | 401 | Passwords need at least 5 characters |
| register_missing_password1 | Register | 401 | 401 |  |
| register_invalid_json | Register | 400 | 400 | A body that isn't valid JSON |
| register_extra_fields | Register | 200 | 200 | isAdmin in the body should be ignored |
| login_alice | Log in | 200 | 200 |  |
| login_bob | Log in | 200 | 200 |  |
| login_carol | Log in | 200 | 200 |  |
| login_dave | Log in | 200 | 200 | Checks whether isAdmin from register_extra_fields was stored |
| login_unknown_user | Log in | 404 | 404 |  |
| login_wrong_password | Log in | 400 | 400 |  |
| login_empty_body | Log in | 404 | 404 |  |
| me | Current user | 200 | 200 |  |
| auth_missing | Authentication | 401 | 401 |  |
| auth_malformed_token | Authentication | 500 | 500 | jwt.decode() returns null for a non-JWT |
| auth_bad_signature | Authentication | 403 | 403 | A JWT signed with a different secret |
| auth_expired | Authentication | 403 | 403 | A JWT signed with the right secret whose exp has passed |
| auth_other_scheme | Authentication | 200 | 200 | The scheme word isn't checked |
| auth_no_scheme | Authentication | 500 | 500 | A token with no scheme word in front |
| user_get | Get a user | 200 | 200 |  |
| user_get_unknown | Get a user | 404 | 404 |  |
| user_get_invalid_id | Get a user | 500 | 500 |  |
| search_all | Search users | 200 | 200 | No search term returns every user |
| search_term | Search users | 200 | 200 |  |
| search_case_insensitive | Search users | 200 | 200 |  |
| search_no_match | Search users | 200 | 200 |  |
| follow | Follow | 200 | 200 | alice follows bob |
| follow_again | Follow | 403 | 403 |  |
| follow_missing_userid | Follow | 400 | 400 |  |
| follow_unknown_user | Follow | 500 | 500 |  |
| follow_invalid_id | Follow | 500 | 500 |  |
| follow_carol_to_alice | Follow | 200 | 200 |  |
| follow_bob_to_alice | Follow | 200 | 200 |  |
| follow_self | Follow | 200 | 200 | Nothing stops a user from following themselves |
| followers | Followers | 200 | 200 | carol and bob follow alice; alice follows bob back |
| following | Following | 200 | 200 |  |
| post_create | Create a post | 200 | 200 |  |
| post_create_with_image | Create a post | 200 | 200 |  |
| post_create_bob | Create a post | 200 | 200 |  |
| post_create_missing_userid | Create a post | 403 | 403 |  |
| post_create_for_other_user | Create a post | 403 | 403 |  |
| post_create_bad_image | Create a post | 403 | 403 |  |
| post_create_long_desc | Create a post | 200 | 200 | The model says max 500; is it enforced? |
| post_create_preset_likes | Create a post | 200 | 200 | Can the client set fields it shouldn't, such as likes? |
| post_get | Get a post | 200 | 200 |  |
| post_get_unknown | Get a post | 200 | 200 |  |
| post_get_invalid_id | Get a post | 500 | 500 |  |
| posts_by_user | List a user's posts | 200 | 200 |  |
| posts_by_unknown_user | List a user's posts | 200 | 200 |  |
| timeline | Timeline | 200 | 200 | alice's posts, then posts from the users she follows (bob) |
| timeline_self_follow | Timeline | 200 | 200 | carol follows alice and herself |
| like | Like a post | 200 | 200 |  |
| like_on_behalf | Like a post | 200 | 200 | alice's token, carol's user ID |
| like_no_body | Like a post | 200 | 200 |  |
| like_unknown_post | Like a post | 500 | 500 |  |
| post_get_after_likes | Get a post | 200 | 200 |  |
| post_get_after_empty_like | Get a post | 200 | 200 |  |
| unfollow | Unfollow | 200 | 200 |  |
| unfollow_again | Unfollow | 403 | 403 |  |
| unfollow_missing_userid | Unfollow | 400 | 400 |  |
| post_delete_not_owner | Delete a post | 403 | 403 |  |
| post_delete | Delete a post | 200 | 200 |  |
| post_delete_again | Delete a post | 500 | 500 |  |
| post_delete_invalid_id | Delete a post | 500 | 500 |  |
| unlike | Like a post | 200 | 200 (server exited) | Liking a second time removes the like |
| after_unlike | Like a post | ECONNREFUSED | ECONNREFUSED (server exited) | Unlike sends 200, then the server crashes (ERR_HTTP_HEADERS_SENT), so this request is refused |
| post_get_after_unlike | Get a post | 200 | 200 | After a restart, if one was needed: was the like removed? |
