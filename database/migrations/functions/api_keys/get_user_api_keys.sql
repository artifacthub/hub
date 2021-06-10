-- get_user_api_keys returns the api keys that belong to the requesting user.
create or replace function get_user_api_keys(p_user_id uuid, p_limit int, p_offset int)
returns table(data json, total_count bigint) as $$
    with user_api_keys as (
        select api_key_id, name
        from api_key
        where user_id = p_user_id
    )
    select
        coalesce(json_agg(akJSON), '[]'),
        (select count(*) from user_api_keys)
    from (
        select akJSON
        from user_api_keys uak
        cross join get_api_key(p_user_id, uak.api_key_id) as akJSON
        order by uak.name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) aks;
$$ language sql;
