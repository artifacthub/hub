create or replace function get_chart_repositories()
returns setof json as $$
    select json_agg(row_to_json(chart_repository))
    from chart_repository;
$$ language sql;


create or replace function get_chart_repository_by_name(p_name text)
returns setof json as $$
    select row_to_json(chart_repository)
    from chart_repository
    where name = p_name;
$$ language sql;


create or replace function register_package(p_pkg jsonb)
returns void as $$
declare
    v_package_id uuid;
    v_maintainer jsonb;
    v_maintainer_id uuid;
begin
    -- Package
    insert into package (
        name,
        display_name,
        description,
        home_url,
        logo_url,
        keywords,
        latest_version,
        package_kind_id,
        chart_repository_id
    ) values (
        p_pkg->>'name',
        nullif(p_pkg->>'display_name', ''),
        nullif(p_pkg->>'description', ''),
        nullif(p_pkg->>'home_url', ''),
        nullif(p_pkg->>'logo_url', ''),
        (select (array(select jsonb_array_elements_text(nullif(p_pkg->'keywords', 'null'::jsonb))))::text[]),
        nullif(p_pkg->>'version', ''),
        (p_pkg->>'kind')::int,
        nullif((p_pkg->'chart_repository')->>'chart_repository_id', '')::uuid
    )
    returning package_id into v_package_id;

    -- Package snapshot
    insert into snapshot (
        package_id,
        version,
        app_version,
        readme,
        links
    ) values (
        v_package_id,
        p_pkg->>'version',
        nullif(p_pkg->>'app_version', ''),
        nullif(p_pkg->>'readme', ''),
        p_pkg->'links'
    );

    -- Package maintainers
    for v_maintainer in select * from jsonb_array_elements(nullif(p_pkg->'maintainers', 'null'::jsonb))
    loop
        -- Register maintainer if needed
        insert into maintainer (name, email)
        values (v_maintainer->>'name', v_maintainer->>'email')
        on conflict (email) do nothing
        returning maintainer_id into v_maintainer_id;

        -- If maintainer was already registered, get the existing maintainer id
        if not found then
            select maintainer_id into v_maintainer_id
            from maintainer
            where email = v_maintainer->>'email';
        end if;

        -- Bind package to maintainer
        insert into package__maintainer (package_id, maintainer_id)
        values (v_package_id, v_maintainer_id);
    end loop;
end
$$ language plpgsql;


create or replace function get_package_version(p_package_id uuid, p_version text)
returns setof json as $$
    select json_build_object(
        'package_id', p.package_id,
        'kind', p.package_kind_id,
        'name', p.name,
        'display_name', p.display_name,
        'description', p.description,
        'home_url', p.home_url,
        'logo_url', p.logo_url,
        'keywords', p.keywords,
        'readme', s.readme,
        'links', s.links,
        'version', s.version,
        'available_versions', (
            select json_agg(distinct(version))
            from snapshot
            where package_id = p_package_id
        ),
        'app_version', s.app_version,
        'last_updated', floor(extract(epoch from p.last_updated)),
        'maintainers', (
            select json_agg(json_build_object(
                'name', m.name,
                'email', m.email
            ))
            from maintainer m
            join package__maintainer pm using (maintainer_id)
            where pm.package_id = p_package_id
        ),
        'chart_repository', (
            select json_build_object(
                'name', r.name,
                'display_name', r.display_name
            )
        )
    )
    from package p
    join snapshot s using (package_id)
    join chart_repository r using (chart_repository_id)
    where package_id = p_package_id
    and s.version = p_version;
$$ language sql;


create or replace function get_package(p_package_id uuid)
returns setof json as $$
    select get_package_version(p_package_id, p.latest_version)
    from package p
    where p.package_id = p_package_id;
$$ language sql;


create or replace function search_packages(p_query jsonb)
returns setof json as $$
    select json_build_object(
        'packages', (
            select coalesce(json_agg(json_build_object(
                'package_id', p.package_id,
                'kind', p.package_kind_id,
                'name', p.name,
                'display_name', p.display_name,
                'description', p.description,
                'logo_url', p.logo_url,
                'latest_version', p.latest_version,
                'chart_repository', (
                    select json_build_object(
                        'name', r.name,
                        'display_name', r.display_name
                    )
                )
            )), '[]')
            from package p
            join chart_repository r using (chart_repository_id)
            where to_tsquery(p_query->>'text') @@ p.tsdoc
        )
    );
$$ language sql;
