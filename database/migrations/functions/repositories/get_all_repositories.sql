-- get_all_repositories returns all available repositories as a json array.
create or replace function get_all_repositories()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', repository_id,
        'name', name,
        'display_name', display_name,
        'url', url,
        'kind', repository_kind_id,
        'verified_publisher', verified_publisher
    )), '[]')
    from repository;
$$ language sql;
