-- get_package_summary returns some details for the provided package as a json
-- object.
create or replace function get_package_summary(p_input jsonb)
returns setof json as $$
declare
    v_package_id uuid;
    v_package_name text := p_input->>'package_name';
    v_repository_name text := p_input->>'repository_name';
begin
    if p_input->>'package_id' <> '' then
        v_package_id = p_input->>'package_id';
    else
        select p.package_id into v_package_id
        from package p
        join repository r using (repository_id)
        where p.normalized_name = v_package_name
        and r.name = v_repository_name;
    end if;

    return query
    select json_strip_nulls(json_build_object(
        'package_id', p.package_id,
        'name', p.name,
        'normalized_name', p.normalized_name,
        'stars', p.stars,
        'official', p.official,
        'cncf', p.cncf,
        'display_name', s.display_name,
        'description', s.description,
        'logo_image_id', s.logo_image_id,
        'version', s.version,
        'app_version', s.app_version,
        'license', s.license,
        'deprecated', s.deprecated,
        'signed', s.signed,
        'signatures', s.signatures,
        'security_report_summary', s.security_report_summary,
        'all_containers_images_whitelisted', are_all_containers_images_whitelisted(s.containers_images),
        'production_organizations_count', (select nullif(
            (select count(*) from production_usage where package_id = v_package_id), 0
        )),
        'ts', floor(extract(epoch from s.ts)),
        'repository', (select get_repository_summary(r.repository_id))
    ))
    from package p
    join snapshot s using (package_id)
    join repository r using (repository_id)
    where p.package_id = v_package_id
    and s.version = p.latest_version;
end
$$ language plpgsql;
