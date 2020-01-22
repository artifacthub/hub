create or replace function semver_gte(p_v1 text, p_v2 text)
returns boolean as $$
declare
    semver_regexp text := '(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?';
    v1_parts text[] = regexp_match(p_v1, semver_regexp);
    v2_parts text[] = regexp_match(p_v2, semver_regexp);
    v1 int[] := v1_parts[1:3]::int[];
    v2 int[] := v2_parts[1:3]::int[];
    v1_prerelease text := v1_parts[4];
    v2_prerelease text := v2_parts[4];
begin
    if v1 > v2 then
        return true;
    elsif v1 = v2 then
        if v1_prerelease is null then
            return true;
        elsif v2_prerelease is null then
            return false;
        else
            return v1_prerelease >= v2_prerelease;
        end if;
    else
        return false;
    end if;
end
$$ language plpgsql;


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


create or replace function get_chart_repository_packages_digest(p_chart_repository_id uuid)
returns setof json as $$
    select coalesce(json_object_agg(format('%s@%s', p.name, s.version), s.digest), '{}')
    from package p
    join snapshot s using (package_id)
    where p.chart_repository_id = p_chart_repository_id;
$$ language sql;


create or replace function register_package(p_pkg jsonb)
returns void as $$
declare
    v_package_id uuid;
    v_latest_version text;
    v_chart_repository_id text := (p_pkg->'chart_repository')->>'chart_repository_id';
    v_package_latest_version_needs_update boolean := false;
    v_maintainer jsonb;
    v_maintainer_id uuid;
begin
    -- Identify if the package latest version needs to be updated
    case p_pkg->>'kind'
        when '0' then -- Chart
            select package_id, latest_version
            into v_package_id, v_latest_version
            from package
            where chart_repository_id = v_chart_repository_id::uuid
            and name = p_pkg->>'name';

            if not found or semver_gte(p_pkg->>'version', v_latest_version) then
                v_package_latest_version_needs_update := true;
            end if;
    end case;

    if v_package_latest_version_needs_update then
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
            p_pkg->>'version',
            (p_pkg->>'kind')::int,
            nullif(v_chart_repository_id, '')::uuid
        )
        on conflict (chart_repository_id, name) do update
        set
            name = excluded.name,
            display_name = excluded.display_name,
            description = excluded.description,
            home_url = excluded.home_url,
            keywords = excluded.keywords,
            latest_version = excluded.latest_version
        returning package_id into v_package_id;

        -- Maintainers
        for v_maintainer in select * from jsonb_array_elements(nullif(p_pkg->'maintainers', 'null'::jsonb))
        loop
            -- Register maintainer if needed
            insert into maintainer (name, email)
            values (v_maintainer->>'name', v_maintainer->>'email')
            on conflict (email) do nothing
            returning maintainer_id into v_maintainer_id;

            -- If maintainer was already registered, get maintainer id
            if not found then
                select maintainer_id into v_maintainer_id
                from maintainer
                where email = v_maintainer->>'email';
            end if;

            -- Bind package to maintainer
            insert into package__maintainer (package_id, maintainer_id)
            values (v_package_id, v_maintainer_id)
            on conflict do nothing;
        end loop;

        -- Unbind deleted maintainers from package
        delete from package__maintainer
        where package_id = v_package_id
        and maintainer_id not in (
            select maintainer_id from maintainer where email in (
                select value->>'email'
                from jsonb_array_elements(nullif(p_pkg->'maintainers', 'null'::jsonb))
            )
        );

        -- Clean up orphan maintainers not bound to any package
        delete from maintainer where maintainer_id not in (
            select maintainer_id from package__maintainer
        );
    end if;

    -- Package snapshot
    insert into snapshot (
        package_id,
        version,
        app_version,
        digest,
        readme,
        links
    ) values (
        v_package_id,
        p_pkg->>'version',
        nullif(p_pkg->>'app_version', ''),
        p_pkg->>'digest',
        nullif(p_pkg->>'readme', ''),
        p_pkg->'links'
    )
    on conflict (package_id, version) do update
    set
        app_version = excluded.app_version,
        digest = excluded.digest,
        readme = excluded.readme,
        links = excluded.links;
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
        'digest', s.digest,
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
                'display_name', r.display_name,
                'url', r.url
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
