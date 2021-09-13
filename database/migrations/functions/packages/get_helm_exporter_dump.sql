-- get_helm_exporter_dump returns a json list with the latest version of all
-- packages of kind Helm available so that they can be used by Helm exporter.
create or replace function get_helm_exporter_dump()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'name', p.name,
        'version', p.latest_version,
        'repository', json_build_object(
            'name', r.name,
            'url', r.url
        )
    )), '[]')
    from package p
    join repository r using (repository_id)
    where r.repository_kind_id = 0;
$$ language sql;
