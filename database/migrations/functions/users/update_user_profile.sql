-- update_user_profile updates some details corresponding to the requesting
-- user in the database.
create or replace function update_user_profile(p_requesting_user_id uuid, p_user jsonb)
returns void as $$
    update "user" set
        alias = p_user->>'alias',
        first_name = nullif(p_user->>'first_name', ''),
        last_name = nullif(p_user->>'last_name', ''),
        profile_image_id = nullif(p_user->>'profile_image_id', '')::uuid
    where user_id = p_requesting_user_id;
$$ language sql;
