-- get_package returns the details as a json object of the package identified
-- by the input provided.
create or replace function get_package(p_input jsonb)
returns setof json as $$
declare
    v_package_id uuid;
    v_repository_kind_id int;
    v_package_name text := p_input->>'package_name';
    v_repository_name text := p_input->>'repository_name';
begin
    if p_input->>'package_id' <> '' then
        v_package_id = p_input->>'package_id';

        select r.repository_kind_id into v_repository_kind_id
        from package p
        join repository r using (repository_id)
        where package_id = v_package_id;
    else
        select p.package_id, r.repository_kind_id
        into v_package_id, v_repository_kind_id
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
        'category', p.package_category_id,
        'is_operator', p.is_operator,
        'official', p.official,
        'cncf', p.cncf,
        'channels', p.channels,
        'default_channel', p.default_channel,
        'display_name', s.display_name,
        'description', s.description,
        'logo_image_id', s.logo_image_id,
        'keywords', s.keywords,
        'home_url', s.home_url,
        'readme', s.readme,
        'install', s.install,
        'links', s.links,
        'crds', s.crds,
        'crds_examples', s.crds_examples,
        'capabilities', s.capabilities,
        'security_report_summary', s.security_report_summary,
        'security_report_created_at', floor(extract(epoch from s.security_report_created_at)),
        'data', enrich_package_data(v_package_id, v_repository_kind_id, s.data),
        'version', s.version,
        'available_versions', (
            select json_agg(json_build_object(
                'version', version,
                'contains_security_updates', contains_security_updates,
                'prerelease', prerelease,
                'ts', floor(extract(epoch from ts))
            ))
            from (
                select *
                from snapshot
                where package_id = v_package_id
                order by ts desc
            ) s
        ),
        'app_version', s.app_version,
        'digest', s.digest,
        'deprecated', s.deprecated,
        'contains_security_updates', s.contains_security_updates,
        'prerelease', s.prerelease,
        'license', s.license,
        'signed', s.signed,
        'signatures', s.signatures,
        'content_url', s.content_url,
        'containers_images', s.containers_images,
        'all_containers_images_whitelisted', are_all_containers_images_whitelisted(s.containers_images),
        'provider', s.provider,
        'has_values_schema', (s.values_schema is not null and s.values_schema <> '{}'),
        'has_changelog', (select exists (
            select 1 from snapshot where package_id = v_package_id and changes is not null
        )),
        'changes', s.changes,
        'ts', floor(extract(epoch from s.ts)),
        'maintainers', (
            select json_agg(json_build_object(
                'name', m.name,
                'email', m.email
            ))
            from maintainer m
            join package__maintainer pm using (maintainer_id)
            where pm.package_id = v_package_id
        ),
        'recommendations', s.recommendations,
        'screenshots', s.screenshots,
        'sign_key', s.sign_key,
        'repository', (select get_repository_summary(r.repository_id)),
        'stats', json_build_object(
            'subscriptions', (select count(*) from subscription where package_id = v_package_id),
            'webhooks', (select count(*) from webhook__package where package_id = v_package_id)
        ),
        'production_organizations_count', (
            select count(*) from production_usage
            where package_id = v_package_id
        ),
        'relative_path', s.relative_path
    ))
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
