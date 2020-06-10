-- get_api_key returns the api key requested as a json object.
create or replace function get_api_key(p_user_id uuid, p_api_key_id uuid)
returns setof json as $$
    select json_build_object(
        'api_key_id', api_key_id,
        'name', name,
        'created_at', floor(extract(epoch from created_at))
    )
    from api_key
    where api_key_id = p_api_key_id
    and user_id = p_user_id
$$ language sql;
