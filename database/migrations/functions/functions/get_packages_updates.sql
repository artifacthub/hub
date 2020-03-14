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
                'display_name', display_name,
                'logo_image_id', logo_image_id,
                'app_version', app_version,
                'chart_repository', (
                    select json_build_object(
                        'chart_repository_id', chart_repository_id,
                        'name', chart_repository_name,
                        'display_name', chart_repository_display_name
                    )
                )
            )), '[]')
            from (
                select
                    p.package_id,
                    p.package_kind_id,
                    p.name,
                    p.display_name,
                    p.logo_image_id,
                    s.app_version,
                    r.chart_repository_id,
                    r.name as chart_repository_name,
                    r.display_name as chart_repository_display_name
                from package p
                join snapshot s using (package_id)
                join chart_repository r using (chart_repository_id)
                where s.version = p.latest_version
                and (p.deprecated is null or p.deprecated = false)
                order by created_at desc limit 5
            ) as lpa
        ),
        'packages_recently_updated', (
            select coalesce(json_agg(json_build_object(
                'package_id', package_id,
                'kind', package_kind_id,
                'name', name,
                'display_name', display_name,
                'logo_image_id', logo_image_id,
                'app_version', app_version,
                'chart_repository', (
                    select json_build_object(
                        'chart_repository_id', chart_repository_id,
                        'name', chart_repository_name,
                        'display_name', chart_repository_display_name
                    )
                )
            )), '[]')
            from (
                select
                    p.package_id,
                    p.package_kind_id,
                    p.name,
                    p.display_name,
                    p.logo_image_id,
                    s.app_version,
                    r.chart_repository_id,
                    r.name as chart_repository_name,
                    r.display_name as chart_repository_display_name
                from package p
                join snapshot s using (package_id)
                join chart_repository r using (chart_repository_id)
                where s.version = p.latest_version
                and (p.deprecated is null or p.deprecated = false)
                order by updated_at desc limit 5
            ) as pru
        )
    );
$$ language sql;
