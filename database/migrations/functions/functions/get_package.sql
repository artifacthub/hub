-- get_package returns the details as a json object of the package identified
-- by the input provided.
create or replace function get_package(p_input jsonb)
returns setof json as $$
declare
    v_package_id uuid;
    v_package_name text := p_input->>'package_name';
    v_chart_repository_name text := p_input->>'chart_repository_name';
begin
    if v_package_name is null or v_package_name = '' then
        raise 'a valid package name must be provided';
    end if;

    if v_chart_repository_name <> '' then
        select p.package_id into v_package_id
        from package p
        join chart_repository r using (chart_repository_id)
        where r.name = v_chart_repository_name
        and p.normalized_name = v_package_name;
    else
        select package_id into v_package_id
        from package
        where normalized_name = v_package_name
        and chart_repository_id is null;
    end if;

    return query
    select json_build_object(
        'package_id', p.package_id,
        'kind', p.package_kind_id,
        'name', p.name,
        'normalized_name', p.normalized_name,
        'display_name', p.display_name,
        'description', p.description,
        'home_url', p.home_url,
        'logo_image_id', p.logo_image_id,
        'keywords', p.keywords,
        'deprecated', p.deprecated,
        'readme', s.readme,
        'links', s.links,
        'data', s.data,
        'version', s.version,
        'available_versions', (
            select json_agg(distinct(version))
            from snapshot
            where package_id = v_package_id
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
            where pm.package_id = v_package_id
        ),
        'chart_repository', (select nullif(
            jsonb_build_object(
                'chart_repository_id', r.chart_repository_id,
                'name', r.name,
                'display_name', r.display_name,
                'url', r.url
            ),
            '{"url": null, "name": null, "display_name": null, "chart_repository_id": null}'::jsonb
        ))
    )
    from package p
    join snapshot s using (package_id)
    left join chart_repository r using (chart_repository_id)
    where p.package_id = v_package_id
    and
        case when p_input->>'version' <> '' then
            s.version = p_input->>'version'
        else
            s.version = p.latest_version
        end;
end
$$ language plpgsql;
