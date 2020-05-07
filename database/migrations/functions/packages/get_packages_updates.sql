-- get_packages_updates returns the latest packages added as well as those
-- which have been updated more recently as a json object.
create or replace function get_packages_updates()
returns setof json as $$
    select json_build_object(
        'latest_packages_added', (
            select coalesce(json_agg(json_build_object(
                'package_id', package_id,
                'kind', package_kind_id,
                'name', name,
                'normalized_name', normalized_name,
                'logo_image_id', logo_image_id,
                'stars', stars,
                'display_name', display_name,
                'version', version,
                'app_version', app_version,
                'user_alias', user_alias,
                'organization_name', organization_name,
                'organization_display_name', organization_display_name,
                'chart_repository', (select nullif(
                    jsonb_build_object(
                        'chart_repository_id', chart_repository_id,
                        'name', chart_repository_name,
                        'display_name', chart_repository_display_name
                    ),
                    '{"chart_repository_id": null, "name": null, "display_name": null}'::jsonb
                ))
            )), '[]')
            from (
                select
                    p.package_id,
                    p.package_kind_id,
                    p.name,
                    p.normalized_name,
                    p.logo_image_id,
                    p.stars,
                    s.display_name,
                    s.version,
                    s.app_version,
                    u.alias as user_alias,
                    o.name as organization_name,
                    o.display_name as organization_display_name,
                    r.chart_repository_id,
                    r.name as chart_repository_name,
                    r.display_name as chart_repository_display_name
                from package p
                join snapshot s using (package_id)
                left join chart_repository r using (chart_repository_id)
                left join "user" u on p.user_id = u.user_id or r.user_id = u.user_id
                left join organization o
                    on p.organization_id = o.organization_id or r.organization_id = o.organization_id
                where s.version = p.latest_version
                and (s.deprecated is null or s.deprecated = false)
                order by p.created_at desc limit 5
            ) as lpa
        ),
        'packages_recently_updated', (
            select coalesce(json_agg(json_build_object(
                'package_id', package_id,
                'kind', package_kind_id,
                'name', name,
                'normalized_name', normalized_name,
                'logo_image_id', logo_image_id,
                'stars', stars,
                'display_name', display_name,
                'version', version,
                'app_version', app_version,
                'user_alias', user_alias,
                'organization_name', organization_name,
                'organization_display_name', organization_display_name,
                'chart_repository', (select nullif(
                    jsonb_build_object(
                        'chart_repository_id', chart_repository_id,
                        'name', chart_repository_name,
                        'display_name', chart_repository_display_name
                    ),
                    '{"chart_repository_id": null, "name": null, "display_name": null}'::jsonb
                ))
            )), '[]')
            from (
                select
                    p.package_id,
                    p.package_kind_id,
                    p.name,
                    p.normalized_name,
                    p.logo_image_id,
                    p.stars,
                    s.display_name,
                    s.version,
                    s.app_version,
                    u.alias as user_alias,
                    o.name as organization_name,
                    o.display_name as organization_display_name,
                    r.chart_repository_id,
                    r.name as chart_repository_name,
                    r.display_name as chart_repository_display_name
                from package p
                join snapshot s using (package_id)
                left join chart_repository r using (chart_repository_id)
                left join "user" u on p.user_id = u.user_id or r.user_id = u.user_id
                left join organization o
                    on p.organization_id = o.organization_id or r.organization_id = o.organization_id
                where s.version = p.latest_version
                and (s.deprecated is null or s.deprecated = false)
                order by p.updated_at desc limit 5
            ) as pru
        )
    );
$$ language sql;
