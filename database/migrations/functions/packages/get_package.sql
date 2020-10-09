-- get_package returns the details as a json object of the package identified
-- by the input provided.
create or replace function get_package(p_input jsonb)
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
    select json_build_object(
        'package_id', p.package_id,
        'name', p.name,
        'normalized_name', p.normalized_name,
        'logo_image_id', p.logo_image_id,
        'is_operator', p.is_operator,
        'channels', p.channels,
        'default_channel', p.default_channel,
        'display_name', s.display_name,
        'description', s.description,
        'keywords', s.keywords,
        'home_url', s.home_url,
        'readme', s.readme,
        'install', s.install,
        'links', s.links,
        'crds', s.crds,
        'crds_examples', s.crds_examples,
        'capabilities', s.capabilities,
        'security_report_summary', s.security_report_summary,
        'data', s.data,
        'version', s.version,
        'available_versions', (
            select json_agg(json_build_object(
                'version', version,
                'created_at', floor(extract(epoch from created_at))
            ))
            from snapshot
            where package_id = v_package_id
        ),
        'app_version', s.app_version,
        'digest', s.digest,
        'deprecated', s.deprecated,
        'license', s.license,
        'signed', s.signed,
        'containers_images', s.containers_images,
        'provider', s.provider,
        'created_at', floor(extract(epoch from s.created_at)),
        'maintainers', (
            select json_agg(json_build_object(
                'name', m.name,
                'email', m.email
            ))
            from maintainer m
            join package__maintainer pm using (maintainer_id)
            where pm.package_id = v_package_id
        ),
        'repository', (select get_repository_summary(r.repository_id))
    )
    from package p
    join snapshot s using (package_id)
    join repository r using (repository_id)
    where p.package_id = v_package_id
    and
        case when p_input->>'version' <> '' then
            s.version = p_input->>'version'
        else
            s.version = p.latest_version
        end;
end
$$ language plpgsql;
