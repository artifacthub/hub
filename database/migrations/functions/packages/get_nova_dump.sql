create or replace function get_nova_dump()
returns setof json as $$
    select coalesce(json_agg(json_strip_nulls(json_build_object(
        'name', p.name,
        'description', s.description,
        'home', s.home_url,
        'latest_version', p.latest_version,
        'links', s.links,
        'logo', s.logo_url,
        'maintainers', (
            select json_agg(json_build_object(
                'name', m.name
            ))
            from maintainer m
            join package__maintainer pm using (maintainer_id)
            where pm.package_id = p.package_id
        ),
        'official', p.official,
        'repository', json_build_object(
            'name', r.name,
            'url', r.url,
            'official', (
                case when r.official=true then r.official else null end
            ),
            'verified', (
                case when r.verified_publisher=true then r.verified_publisher else null end
            )
        ),
        'versions', (
            select json_agg(json_build_object(
                'pkg', version,
                'app', app_version,
                'kube', nullif(s.data->>'kubeVersion', ''),
                'deprecated', nullif(deprecated, false)
            ))
            from snapshot
            where package_id = p.package_id
        )
    ))), '[]')
    from package p
    join repository r using (repository_id)
    join snapshot s using (package_id)
    where p.latest_version = s.version
    and r.repository_kind_id = 0;
$$ language sql;
