-- get_package_summary returns some details for the provided package as a json
-- object.
create or replace function get_package_summary(p_package_id uuid)
returns setof json as $$
    select json_build_object(
        'package_id', p.package_id,
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
        'created_at', floor(extract(epoch from s.created_at)),
        'repository', jsonb_build_object(
            'repository_id', r.repository_id,
            'kind', r.repository_kind_id,
            'name', r.name,
            'display_name', r.display_name,
            'url', r.url,
            'verified_publisher', r.verified_publisher,
            'official', r.official,
            'user_alias', u.alias,
            'organization_name', o.name,
            'organization_display_name', o.display_name
        )
    )
    from package p
    join snapshot s using (package_id)
    join repository r using (repository_id)
    left join "user" u using (user_id)
    left join organization o using (organization_id)
    where p.package_id = p_package_id
    and s.version = p.latest_version;
$$ language sql;
