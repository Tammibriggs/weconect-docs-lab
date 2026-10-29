# Capture run 2026-10-29T06-59-05

183 cases, 183 as expected, 0 different, 1 server restart(s).

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
| auth_malformed_token | Authentication | 401 | 401 | Neither a key nor a token; 500 before 1.1.1 (finding 7) |
| auth_bad_signature | Authentication | 403 | 403 | A JWT signed with a different secret |
| auth_expired | Authentication | 403 | 403 | A JWT signed with the right secret whose exp has passed |
| auth_other_scheme | Authentication | 200 | 200 | The scheme word isn't checked |
| auth_no_scheme | Authentication | 401 | 401 | A token with no scheme word in front; 500 before 1.1.1 |
| auth_malformed_token_internal | Authentication | 403 | 403 | An internal endpoint: treated as a bad token; 500 before 1.1.1 |
| user_get | Get a user | 200 | 200 |  |
| user_get_unknown | Get a user | 404 | 404 |  |
| user_get_invalid_id | Get a user | 500 | 500 |  |
| user_get_12_char_id | Get a user | 404 | 404 | Mongoose reads any 12 characters as an ObjectId, so this is an unknown ID, not an invalid one |
| search_all | Search users | 200 | 200 | No search term returns every user. Since 2026-10-26, without passwords (finding 1 fixed) |
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
| posts_by_user_with_image | List a user's posts | 200 | 200 | Added 2026-10-28: alice's posts include one with an image |
| posts_by_unknown_user | List a user's posts | 200 | 200 |  |
| posts_by_user_no_posts | List a user's posts | 200 | 200 | carol never posts: an empty list |
| timeline | Timeline | 200 | 200 | alice's posts, then posts from the users she follows (bob) |
| timeline_self_follow | Timeline | 200 | 200 | carol follows alice and herself |
| like | Like a post | 200 | 200 |  |
| like_on_behalf | Like a post | 200 | 200 | alice's token, carol's user ID. Since 2026-10-26 the like is alice's own (finding 2 fixed) |
| like_no_body | Like a post | 200 | 200 | Since 2026-10-26 this adds alice's ID; before, it added null (finding 17 fixed) |
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
| post_delete_12_char_id | Delete a post | 500 | 500 | A Postman variable missing a brace: 12 characters, so an unknown ID ({}), not an invalid one |
| keys_create | Create an API key | 201 | 201 |  |
| keys_create_read_only | Create an API key | 201 | 201 |  |
| keys_create_bob | Create an API key | 201 | 201 | Scopes are returned in a fixed order: read, write |
| keys_create_write_only | Create an API key | 201 | 201 |  |
| keys_create_missing_name | Create an API key | 400 | 400 |  |
| keys_create_long_name | Create an API key | 400 | 400 | Names can be up to 50 characters |
| keys_create_bad_scope | Create an API key | 400 | 400 |  |
| keys_create_no_scopes | Create an API key | 400 | 400 |  |
| keys_create_no_auth | Create an API key | 401 | 401 |  |
| keys_create_with_api_key | Create an API key | 403 | 403 | A key can't create keys, so a leaked key can't make more |
| keys_list | List API keys | 200 | 200 | Newest first; the key itself is never returned again |
| key_me | Current user | 200 | 200 |  |
| key_read_only_me | Current user | 200 | 200 |  |
| key_get_user | Get a user | 200 | 200 |  |
| key_search | Search users | 200 | 200 | No password in the results (finding 1 fixed) |
| key_user_posts | List a user's posts | 200 | 200 |  |
| key_timeline | Timeline | 200 | 200 |  |
| key_create_post | Create a post | 200 | 200 |  |
| key_create_post_read_only | Create a post | 403 | 403 | A read-only key can't call write endpoints |
| key_create_post_as_other_user | Create a post | 403 | 403 | A key acts as its owner, bob |
| key_write_only_read | Search users | 403 | 403 | A write-only key can't call read endpoints |
| key_like | Like a post | 200 | 200 |  |
| key_like_read_only | Like a post | 403 | 403 |  |
| key_delete_post_read_only | Delete a post | 403 | 403 |  |
| key_delete_other_users_post | Delete a post | 403 | 403 | bob's key can't delete alice's post |
| key_delete_post | Delete a post | 200 | 200 |  |
| key_follow | Follow | 200 | 200 |  |
| key_follow_read_only | Follow | 403 | 403 |  |
| key_unfollow_read_only | Unfollow | 403 | 403 | Added 2026-10-28: an error object, unlike unfollow's other 403 |
| key_unfollow | Unfollow | 200 | 200 |  |
| key_on_internal_endpoint | API keys | 403 | 403 | Keys work only on the 10 public endpoints |
| key_invalid | API keys | 401 | 401 |  |
| key_without_prefix | API keys | 401 | 401 | Found in Postman: 500 before 1.1.1 |
| key_without_bearer | API keys | 401 | 401 | A real key, but no "Bearer " in front |
| keys_delete_other_user | Delete an API key | 404 | 404 | bob can't delete alice's key |
| keys_delete_unknown | Delete an API key | 404 | 404 |  |
| keys_delete_invalid_id | Delete an API key | 404 | 404 |  |
| keys_delete | Delete an API key | 200 | 200 |  |
| key_deleted | API keys | 401 | 401 | A deleted key stops working at once |
| keys_list_after_delete | List API keys | 200 | 200 | One key left; lastUsedAt is set because the key was used above |
| keys_list_bob | List API keys | 200 | 200 | Each user sees only their own keys |
| keys_list_empty | List API keys | 200 | 200 | carol has no keys: an empty list |
| user_get_no_auth | Get a user | 401 | 401 |  |
| search_no_auth | Search users | 401 | 401 |  |
| follow_no_auth | Follow | 401 | 401 |  |
| unfollow_no_auth | Unfollow | 401 | 401 |  |
| post_create_no_auth | Create a post | 401 | 401 |  |
| posts_by_user_no_auth | List a user's posts | 401 | 401 |  |
| post_delete_no_auth | Delete a post | 401 | 401 |  |
| timeline_no_auth | Timeline | 401 | 401 |  |
| like_no_auth | Like a post | 401 | 401 |  |
| keys_list_no_auth | List API keys | 401 | 401 |  |
| keys_delete_no_auth | Delete an API key | 401 | 401 |  |
| key_write_only_me | Current user | 403 | 403 |  |
| key_write_only_get_user | Get a user | 403 | 403 |  |
| key_write_only_user_posts | List a user's posts | 403 | 403 |  |
| key_write_only_timeline | Timeline | 403 | 403 |  |
| keys_list_with_api_key | List API keys | 403 | 403 |  |
| keys_delete_with_api_key | Delete an API key | 403 | 403 | The key isn't deleted |
| user_get_expired_token | Get a user | 403 | 403 |  |
| search_expired_token | Search users | 403 | 403 |  |
| follow_expired_token | Follow | 403 | 403 |  |
| unfollow_expired_token | Unfollow | 403 | 403 |  |
| post_create_expired_token | Create a post | 403 | 403 |  |
| posts_by_user_expired_token | List a user's posts | 403 | 403 |  |
| post_delete_expired_token | Delete a post | 403 | 403 |  |
| timeline_expired_token | Timeline | 403 | 403 |  |
| like_expired_token | Like a post | 403 | 403 |  |
| keys_create_expired_token | Create an API key | 403 | 403 |  |
| keys_list_expired_token | List API keys | 403 | 403 |  |
| keys_delete_expired_token | Delete an API key | 403 | 403 |  |
| login_invalid_json | Log in | 400 | 400 | A comment, which JSON doesn't allow |
| keys_create_invalid_json | Create an API key | 400 | 400 | A value without quotes |
| follow_invalid_json | Follow | 400 | 400 | Single quotes |
| unfollow_invalid_json | Unfollow | 400 | 400 | A missing closing brace |
| post_create_invalid_json | Create a post | 400 | 400 | An ID without quotes, as Postman sends [{{id}}] |
| like_invalid_json | Like a post | 400 | 400 | A trailing comma |
| search_special_dot | Search users | 200 | 200 | As a regex, a.i would match alice; escaped, it matches nobody |
| search_special_paren | Search users | 200 | 200 | An unescaped ( would be an invalid regex and a 500 |
| register_unicode | Register | 200 | 200 |  |
| login_unicode | Log in | 200 | 200 |  |
| post_create_unicode | Create a post | 200 | 200 |  |
| register_password_min | Register | 200 | 200 | Exactly 5 characters, the shortest allowed |
| login_erin | Log in | 200 | 200 |  |
| register_password_empty | Register | 401 | 401 |  |
| register_username_empty | Register | 401 | 401 |  |
| register_username_short | Register | 200 | 200 | The model says min 3; Mongoose's min applies only to numbers |
| register_username_long | Register | 200 | 200 | The model says max 20; Mongoose's max applies only to numbers |
| post_create_empty_desc | Create a post | 200 | 200 |  |
| register_username_case | Register | 200 | 200 | alice already exists; the unique index is case-sensitive |
| login_username_case | Log in | 404 | 404 |  |
| register_form_encoded | Register | 401 | 401 | Only JSON bodies are parsed, so the API sees no username |
| wrong_method | General | 404 | 404 | Express answers an unsupported method with its 404 page, not 405 |
| followers_empty | Followers | 200 | 200 |  |
| following_empty | Following | 200 | 200 |  |
| timeline_empty | Timeline | 200 | 200 |  |
| profile_update | Update the current user | 200 | 200 |  |
| me_with_profile | Current user | 200 | 200 |  |
| user_get_with_profile | Get a user | 200 | 200 |  |
| search_with_profile | Search users | 200 | 200 |  |
| login_with_profile | Log in | 200 | 200 |  |
| profile_update_long_bio | Update the current user | 200 | 200 | The model's 50-character limit isn't enforced (finding 18) |
| me_after_long_bio | Current user | 200 | 200 | The 60-character bio was saved |
| unlike | Like a post | 200 | 200 (server exited) | Liking a second time removes the like |
| after_unlike | Like a post | ECONNREFUSED | ECONNREFUSED (server exited) | Unlike sends 200, then the server crashes (ERR_HTTP_HEADERS_SENT), so this request is refused |
| post_get_after_unlike | Get a post | 200 | 200 | After a restart, if one was needed: was the like removed? |
