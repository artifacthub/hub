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
    v_keywords text[] := (select nullif(array(select jsonb_array_elements_text(nullif(p_pkg->'keywords', 'null'::jsonb))), '{}'));
    v_version text := p_pkg->>'version';
    v_repository_id uuid := ((p_pkg->'repository')->>'repository_id')::uuid;
    v_maintainer jsonb;
    v_maintainer_id uuid;
    v_ts timestamptz;
    v_provider text := nullif(p_pkg->>'provider', '');
    v_ts_repository text[];
    v_ts_publisher text[];
    v_repository_disabled boolean;
begin
    -- Get some repository information (some of it for tsdoc)
    select r.disabled, array[r.name, r.display_name], array[u.alias, o.name, o.display_name, v_provider]
    into v_repository_disabled, v_ts_repository, v_ts_publisher
    from repository r
    left join "user" u using (user_id)
    left join organization o using (organization_id)
    where repository_id = v_repository_id;

    -- If repository is disabled, package registration will be canceled. This
    -- may happen if a repository is disabled while it's being processed by the
    -- tracker.
    if v_repository_disabled then
        raise 'repository is disabled';
    end if;

    -- Get package's latest version before registration, if available
    select latest_version into v_previous_latest_version
    from package
    where name = v_name
    and repository_id = v_repository_id;

    -- Package
    insert into package (
        name,
        latest_version,
        tsdoc,
        is_operator,
        channels,
        default_channel,
        repository_id
    ) values (
        v_name,
        v_version,
        generate_package_tsdoc(v_name, v_display_name, v_description, v_keywords, v_ts_repository, v_ts_publisher),
        (p_pkg->>'is_operator')::boolean,
        nullif(p_pkg->'channels', 'null'),
        nullif(p_pkg->>'default_channel', ''),
        v_repository_id
    )
    on conflict (repository_id, name) do update
    set
        name = excluded.name,
        latest_version = excluded.latest_version,
        tsdoc = generate_package_tsdoc(v_name, v_display_name, v_description, v_keywords, v_ts_repository, v_ts_publisher),
        is_operator = excluded.is_operator,
        channels = excluded.channels,
        default_channel = excluded.default_channel
    where semver_gte(v_version, package.latest_version) = true
    returning package_id into v_package_id;

    -- If package record has been created or updated
    if found then
        -- Maintainers
        for v_maintainer in select * from jsonb_array_elements(nullif(p_pkg->'maintainers', 'null'::jsonb))
        loop
            -- Register or update maintainer if needed
            insert into maintainer (name, email)
            values (v_maintainer->>'name', v_maintainer->>'email')
            on conflict (email) do
                update set name = v_maintainer->>'name'
                where maintainer.name <> v_maintainer->>'name'
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
        and repository_id = v_repository_id;
    end if;

    -- Package snapshot
    v_ts := to_timestamp((p_pkg->>'ts')::int);
    if v_ts is null then
        v_ts = current_timestamp;
    end if;
    insert into snapshot (
        package_id,
        version,
        display_name,
        description,
        logo_url,
        logo_image_id,
        keywords,
        home_url,
        app_version,
        digest,
        readme,
        install,
        links,
        crds,
        crds_examples,
        capabilities,
        data,
        deprecated,
        license,
        signed,
        content_url,
        containers_images,
        provider,
        values_schema,
        changes,
        contains_security_updates,
        prerelease,
        recommendations,
        ts
    ) values (
        v_package_id,
        v_version,
        v_display_name,
        v_description,
        nullif(p_pkg->>'logo_url', ''),
        nullif(p_pkg->>'logo_image_id', '')::uuid,
        v_keywords,
        nullif(p_pkg->>'home_url', ''),
        nullif(p_pkg->>'app_version', ''),
        nullif(p_pkg->>'digest', ''),
        nullif(p_pkg->>'readme', ''),
        nullif(p_pkg->>'install', ''),
        nullif(p_pkg->'links', 'null'),
        nullif(p_pkg->'crds', 'null'),
        nullif(p_pkg->'crds_examples', 'null'),
        nullif(p_pkg->>'capabilities', ''),
        nullif(p_pkg->'data', 'null'),
        (p_pkg->>'deprecated')::boolean,
        nullif(p_pkg->>'license', ''),
        (p_pkg->>'signed')::boolean,
        nullif(p_pkg->>'content_url', ''),
        nullif(p_pkg->'containers_images', 'null'),
        v_provider,
        nullif(p_pkg->'values_schema', 'null'),
        nullif(p_pkg->'changes', 'null'),
        (p_pkg->>'contains_security_updates')::boolean,
        (p_pkg->>'prerelease')::boolean,
        nullif(p_pkg->'recommendations', 'null'),
        v_ts
    )
    on conflict (package_id, version) do update
    set
        display_name = excluded.display_name,
        description = excluded.description,
        logo_url = excluded.logo_url,
        logo_image_id = excluded.logo_image_id,
        keywords = excluded.keywords,
        home_url = excluded.home_url,
        app_version = excluded.app_version,
        digest = excluded.digest,
        readme = excluded.readme,
        install = excluded.install,
        links = excluded.links,
        crds = excluded.crds,
        crds_examples = excluded.crds_examples,
        capabilities = excluded.capabilities,
        data = excluded.data,
        deprecated = excluded.deprecated,
        license = excluded.license,
        signed = excluded.signed,
        content_url = excluded.content_url,
        containers_images = excluded.containers_images,
        provider = excluded.provider,
        values_schema = excluded.values_schema,
        changes = excluded.changes,
        contains_security_updates = excluded.contains_security_updates,
        prerelease = excluded.prerelease,
        recommendations = excluded.recommendations,
        ts = v_ts;

    -- Register new release event if package's latest version has been updated
    if semver_gt(v_version, v_previous_latest_version) then
        insert into event (package_id, package_version, event_kind_id)
        values (v_package_id, v_version, 0);
    end if;
end
$$ language plpgsql;
