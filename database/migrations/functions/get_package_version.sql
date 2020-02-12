-- get_package_version returns the details of the package identified by the id
-- and version provided as a json object.
create or replace function get_package_version(p_package_id uuid, p_version text)
returns setof json as $$
    select json_build_object(
        'package_id', p.package_id,
        'kind', p.package_kind_id,
        'name', p.name,
        'display_name', p.display_name,
        'description', p.description,
        'home_url', p.home_url,
        'image_id', p.image_id,
        'keywords', p.keywords,
        'readme', s.readme,
        'links', s.links,
        'version', s.version,
        'available_versions', (
            select json_agg(distinct(version))
            from snapshot
            where package_id = p_package_id
        ),
        'app_version', s.app_version,
        'digest', s.digest,
        'maintainers', (
            select json_agg(json_build_object(
                'name', m.name,
                'email', m.email
            ))
            from maintainer m
            join package__maintainer pm using (maintainer_id)
            where pm.package_id = p_package_id
        ),
        'chart_repository', (
            select json_build_object(
                'name', r.name,
                'display_name', r.display_name,
                'url', r.url
            )
        )
    )
    from package p
    join snapshot s using (package_id)
    join chart_repository r using (chart_repository_id)
    where package_id = p_package_id
    and s.version = p_version;
$$ language sql;
