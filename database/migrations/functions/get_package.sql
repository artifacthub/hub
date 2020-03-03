-- get_package returns the details as a json object of the package identified
-- by the input provided.
create or replace function get_package(p_input jsonb)
returns setof json as $$
declare
    v_package_id uuid;
    v_package_name text := p_input->>'package_name';
    v_chart_repository_name text := p_input->>'chart_repository_name';
begin
    case (p_input->>'kind')::int
        when 0 then -- chart
            if v_chart_repository_name is null or v_chart_repository_name = '' then
                raise 'a valid chart repository name must be provided';
            end if;
            if v_package_name is null or v_package_name = '' then
                raise 'a valid package name must be provided';
            end if;

            select p.package_id into v_package_id
            from package p
            join chart_repository r using (chart_repository_id)
            where r.name = v_chart_repository_name
            and p.name = v_package_name;
        else
            raise 'a valid package kind must be provided';
    end case;

    return query
    select json_build_object(
        'package_id', p.package_id,
        'kind', p.package_kind_id,
        'name', p.name,
        'display_name', p.display_name,
        'description', p.description,
        'home_url', p.home_url,
        'logo_image_id', p.logo_image_id,
        'keywords', p.keywords,
        'readme', s.readme,
        'links', s.links,
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
        'chart_repository', (
            select json_build_object(
                'chart_repository_id', r.chart_repository_id,
                'name', r.name,
                'display_name', r.display_name,
                'url', r.url
            )
        )
    )
    from package p
    join snapshot s using (package_id)
    join chart_repository r using (chart_repository_id)
    where p.package_id = v_package_id
    and
        case when p_input->>'version' <> '' then
            s.version = p_input->>'version'
        else
            s.version = p.latest_version
        end;
end
$$ language plpgsql;
