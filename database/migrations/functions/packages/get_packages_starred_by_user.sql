-- get_packages_starred_by_user returns the packages starred by the user as a
-- json array.
create or replace function get_packages_starred_by_user(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'package_id', package_id,
        'kind', package_kind_id,
        'name', name,
        'normalized_name', normalized_name,
        'display_name', display_name,
        'description', description,
        'logo_image_id', logo_image_id,
        'deprecated', deprecated,
        'stars', stars,
        'version', version,
        'app_version', app_version,
        'organization_name', organization_name,
        'organization_display_name', organization_display_name,
        'chart_repository', (select nullif(
            jsonb_build_object(
                'name', chart_repository_name,
                'display_name', chart_repository_display_name
            ),
            '{"name": null, "display_name": null}'::jsonb
        ))
    )), '[]')
    from (
        select
            p.package_id,
            p.package_kind_id,
            p.name,
            p.normalized_name,
            p.display_name,
            p.description,
            p.logo_image_id,
            p.deprecated,
            p.stars,
            s.version,
            s.app_version,
            o.name as organization_name,
            o.display_name as organization_display_name,
            r.name as chart_repository_name,
            r.display_name as chart_repository_display_name
        from package p
        join user_starred_package usp on usp.user_id = p_user_id and usp.package_id = p.package_id
        join snapshot s on s.package_id = p.package_id
        left join organization o on o.organization_id = p.organization_id
        left join chart_repository r using (chart_repository_id)
        where s.version = p.latest_version
        order by p.name asc
    ) user_starred_packages;
$$ language sql;
