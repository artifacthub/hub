-- get_repositories_by_kind returns all available repositories of a given kind
-- as a json array.
create or replace function get_repositories_by_kind(p_kind int)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', repository_id,
        'name', name,
        'display_name', display_name,
        'url', url,
        'kind', repository_kind_id,
        'verified_publisher', verified_publisher
    )), '[]')
    from repository
    where repository_kind_id = p_kind;
$$ language sql;
