-- get_user_profile returns the profile of the provided user.
create or replace function get_user_profile(p_user_id uuid)
returns setof json as $$
    select json_build_object(
        'alias', u.alias,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'email', u.email
    )
    from "user" u
    where u.user_id = p_user_id;
$$ language sql;
