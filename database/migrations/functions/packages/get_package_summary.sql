-- get_package_summary returns some details for the provided package as a json
-- object.
create or replace function get_package_summary(p_package_id uuid)
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'package_id', p.package_id,
        'name', p.name,
        'normalized_name', p.normalized_name,
        'logo_image_id', p.logo_image_id,
        'stars', p.stars,
        'official', p.official,
        'display_name', s.display_name,
        'description', s.description,
        'version', s.version,
        'app_version', s.app_version,
        'license', s.license,
        'deprecated', s.deprecated,
        'signed', s.signed,
        'security_report_summary', s.security_report_summary,
        'created_at', floor(extract(epoch from s.created_at)),
        'repository', (select get_repository_summary(r.repository_id))
    ))
    from package p
    join snapshot s using (package_id)
    join repository r using (repository_id)
    where p.package_id = p_package_id
    and s.version = p.latest_version;
$$ language sql;
