-- get_user_tfa_config returns the 2fa configuration of the provided user.
create or replace function get_user_tfa_config(p_user_id uuid)
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'enabled', u.tfa_enabled,
        'recovery_codes', u.tfa_recovery_codes,
        'url', u.tfa_url
    ))
    from "user" u
    where u.user_id = p_user_id;
$$ language sql;
