-- get_package_summary returns some details for the provided package as a json
-- object.
create or replace function get_package_summary(p_package_id uuid)
returns setof json as $$
    select json_build_object(
        'package_id', p.package_id,
        'kind', p.package_kind_id,
        'name', p.name,
        'normalized_name', p.normalized_name,
        'logo_image_id', p.logo_image_id,
        'stars', p.stars,
        'display_name', s.display_name,
        'description', s.description,
        'version', s.version,
        'app_version', s.app_version,
        'deprecated', s.deprecated,
        'signed', s.signed,
        'user_alias', u.alias,
        'organization_name', o.name,
        'organization_display_name', o.display_name,
        'chart_repository', (select nullif(
            jsonb_build_object(
                'chart_repository_id', r.chart_repository_id,
                'name', r.name,
                'display_name', r.display_name
            ),
            '{"chart_repository_id": null, "name": null, "display_name": null}'::jsonb
        ))
    )
    from package p
    join snapshot s using (package_id)
    left join chart_repository r using (chart_repository_id)
    left join "user" u on p.user_id = u.user_id or r.user_id = u.user_id
    left join organization o on p.organization_id = o.organization_id or r.organization_id = o.organization_id
    where p.package_id = p_package_id
    and s.version = p.latest_version;
$$ language sql;
