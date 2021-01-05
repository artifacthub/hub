-- get_harbor_replication_dump returns a json list with all packages versions
-- of kind Helm available so that they can be synchronized in Harbor.
create or replace function get_harbor_replication_dump()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository', r.name,
        'package', p.normalized_name,
        'version', s.version,
        'url', s.content_url
    )), '[]')
    from package p
    join repository r using (repository_id)
    join snapshot s using (package_id)
    where r.repository_kind_id = 0
    and (s.deprecated is null or s.deprecated = false)
    and s.content_url is not null;
$$ language sql;
