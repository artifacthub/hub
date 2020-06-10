-- get_user_api_keys returns the api keys that belong to the requesting user.
create or replace function get_user_api_keys(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(akJSON), '[]')
    from (
        select akJSON
        from api_key ak
        cross join get_api_key(p_user_id, api_key_id) as akJSON
        where user_id = p_user_id
        order by ak.name asc
    ) aks;
$$ language sql;
