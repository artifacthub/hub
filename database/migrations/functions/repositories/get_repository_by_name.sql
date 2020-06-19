-- get_repository_by_name returns the repository identified by the name
-- provided as a json object.
create or replace function get_repository_by_name(p_name text)
returns setof json as $$
    select json_build_object(
        'repository_id', repository_id,
        'name', name,
        'display_name', display_name,
        'url', url,
        'kind', repository_kind_id
    )
    from repository
    where name = p_name;
$$ language sql;
