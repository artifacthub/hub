-- register_package registers the provided package in the database. This
-- involves registering or updating the package entity when needed, registering
-- a snapshot for the package version and creating/updating/deleting the
-- package maintainers as needed depending on the ones present in the latest
-- package version.
create or replace function register_package(p_pkg jsonb)
returns void as $$
declare
    v_package_id uuid;
    v_chart_repository_id text := (p_pkg->'chart_repository')->>'chart_repository_id';
    v_package_latest_version_needs_update boolean := false;
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
        logo_image_id,
        keywords,
        deprecated,
        latest_version,
        package_kind_id,
        chart_repository_id
    ) values (
        p_pkg->>'name',
        nullif(p_pkg->>'display_name', ''),
        nullif(p_pkg->>'description', ''),
        nullif(p_pkg->>'home_url', ''),
        nullif(p_pkg->>'logo_url', ''),
        nullif(p_pkg->>'logo_image_id', '')::uuid,
        (select (array(select jsonb_array_elements_text(nullif(p_pkg->'keywords', 'null'::jsonb))))::text[]),
        (p_pkg->>'deprecated')::boolean,
        p_pkg->>'version',
        (p_pkg->>'kind')::int,
        nullif(v_chart_repository_id, '')::uuid
    )
    on conflict (package_kind_id, chart_repository_id, name) do update
    set
        name = excluded.name,
        display_name = excluded.display_name,
        description = excluded.description,
        home_url = excluded.home_url,
        logo_url = excluded.logo_url,
        logo_image_id = excluded.logo_image_id,
        keywords = excluded.keywords,
        deprecated = excluded.deprecated,
        latest_version = excluded.latest_version,
        updated_at = current_timestamp
    where semver_gte(p_pkg->>'version', package.latest_version) = true
    returning package_id into v_package_id;

    if found then
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
    else
        select package_id into v_package_id
        from package
        where chart_repository_id = v_chart_repository_id::uuid
        and name = p_pkg->>'name';
    end if;

    -- Package snapshot
    insert into snapshot (
        package_id,
        version,
        app_version,
        digest,
        readme,
        links,
        data
    ) values (
        v_package_id,
        p_pkg->>'version',
        nullif(p_pkg->>'app_version', ''),
        nullif(p_pkg->>'digest', ''),
        nullif(p_pkg->>'readme', ''),
        p_pkg->'links',
        p_pkg->'data'
    )
    on conflict (package_id, version) do update
    set
        app_version = excluded.app_version,
        digest = excluded.digest,
        readme = excluded.readme,
        links = excluded.links;
end
$$ language plpgsql;
