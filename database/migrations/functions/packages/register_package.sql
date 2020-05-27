-- register_package registers the provided package in the database. This
-- involves registering or updating the package entity when needed, registering
-- a snapshot for the package version and creating/updating/deleting the
-- package maintainers as needed depending on the ones present in the latest
-- package version.
create or replace function register_package(p_pkg jsonb)
returns void as $$
declare
    v_previous_latest_version text;
    v_package_id uuid;
    v_name text := p_pkg->>'name';
    v_display_name text := nullif(p_pkg->>'display_name', '');
    v_description text := nullif(p_pkg->>'description', '');
    v_keywords text[] := (select (array(select jsonb_array_elements_text(nullif(p_pkg->'keywords', 'null'::jsonb))))::text[]);
    v_version text := p_pkg->>'version';
    v_package_kind_id int := (p_pkg->>'kind')::int;
    v_user_id uuid := nullif(p_pkg->>'user_id', '')::uuid;
    v_organization_id uuid := nullif(p_pkg->>'organization_id', '')::uuid;
    v_chart_repository_id uuid := ((p_pkg->'chart_repository')->>'chart_repository_id')::uuid;
    v_maintainer jsonb;
    v_maintainer_id uuid;
begin
    -- Check if a package with the same name and kind but a different owner
    -- already exists.
    -- NOTE: packages of kind Helm Chart are allowed to have the same name when
    -- they belong to different repositories as the repo acts as a namespace.
    perform
    from package
    where package_kind_id = v_package_kind_id
    and name = v_name
    and chart_repository_id is null
    and (
        user_id <> v_user_id
        or organization_id <> v_organization_id
        or (user_id is null and v_user_id is not null)
        or (organization_id is null and v_organization_id is not null)
    );
    if found then
        raise unique_violation;
    end if;

    -- Get package's latest version before registration, if available
    select latest_version into v_previous_latest_version
    from package
    where package_kind_id = v_package_kind_id
    and name = v_name
    and
        case when v_chart_repository_id is null then
            chart_repository_id is null
        else
            chart_repository_id = v_chart_repository_id
        end;

    -- Package
    insert into package (
        name,
        logo_url,
        logo_image_id,
        latest_version,
        tsdoc,
        package_kind_id,
        user_id,
        organization_id,
        chart_repository_id
    ) values (
        v_name,
        nullif(p_pkg->>'logo_url', ''),
        nullif(p_pkg->>'logo_image_id', '')::uuid,
        v_version,
        generate_package_tsdoc(v_name, v_display_name, v_description, v_keywords),
        v_package_kind_id,
        v_user_id,
        v_organization_id,
        v_chart_repository_id
    )
    on conflict (
        coalesce(chart_repository_id, '99999999-9999-9999-9999-999999999999'),
        package_kind_id,
        name
    )
    do update
    set
        name = excluded.name,
        logo_url = excluded.logo_url,
        logo_image_id = excluded.logo_image_id,
        latest_version = excluded.latest_version,
        tsdoc = generate_package_tsdoc(v_name, v_display_name, v_description, v_keywords),
        updated_at = current_timestamp
    where semver_gte(v_version, package.latest_version) = true
    returning package_id into v_package_id;

    -- If package record has been created or updated
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
        -- Package record was not created or updated, get package id to insert snapshot
        select package_id into v_package_id
        from package
        where name = v_name
        and
            case when v_chart_repository_id is null then
                chart_repository_id is null
            else
                chart_repository_id = v_chart_repository_id
            end;
    end if;

    -- Package snapshot
    insert into snapshot (
        package_id,
        version,
        display_name,
        description,
        keywords,
        home_url,
        app_version,
        digest,
        readme,
        links,
        data,
        deprecated,
        license,
        content_url
    ) values (
        v_package_id,
        v_version,
        v_display_name,
        v_description,
        v_keywords,
        nullif(p_pkg->>'home_url', ''),
        nullif(p_pkg->>'app_version', ''),
        nullif(p_pkg->>'digest', ''),
        nullif(p_pkg->>'readme', ''),
        p_pkg->'links',
        p_pkg->'data',
        (p_pkg->>'deprecated')::boolean,
        nullif(p_pkg->>'license', ''),
        nullif(p_pkg->>'content_url', '')
    )
    on conflict (package_id, version) do update
    set
        display_name = excluded.display_name,
        description = excluded.description,
        keywords = excluded.keywords,
        home_url = excluded.home_url,
        app_version = excluded.app_version,
        digest = excluded.digest,
        readme = excluded.readme,
        links = excluded.links,
        deprecated = excluded.deprecated,
        license = excluded.license,
        content_url = excluded.content_url,
        updated_at = current_timestamp;

    -- Register new release event if package's latest version has been updated
    if semver_gt(v_version, v_previous_latest_version) then
        insert into event (package_id, package_version, event_kind_id)
        values (v_package_id, v_version, 0)
        on conflict do nothing;
    end if;
end
$$ language plpgsql;
