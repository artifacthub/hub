-- unregister_package unregisters the provided package version from the database.
create or replace function unregister_package(p_pkg jsonb)
returns void as $$
declare
    v_package_id uuid;
    v_latest_version text;
    v_snapshots_count int;
    v_semver_regexp text := '(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?';
begin
    -- Get package id and latest version and lock it
    select package_id, latest_version
    into v_package_id, v_latest_version
    from package
    where name = p_pkg->>'name'
    and repository_id = ((p_pkg->'repository')->>'repository_id')::uuid
    for update;

    -- Get package's snapshots count
    select count(*) into v_snapshots_count
    from snapshot
    where package_id = v_package_id;
    if not found then
        return;
    end if;

    -- If the version to delete is the only one available we delete the package
    -- (some other elements will be deleted on cascade)
    if v_snapshots_count = 1 then
        delete from package where package_id = v_package_id;

        -- Clean up orphan maintainers not bound to any package
        delete from maintainer where maintainer_id not in (
            select maintainer_id from package__maintainer
        );
    else
        -- If the version to delete is the last version, we need to update the
        -- package's latest version
        if p_pkg->>'version' = v_latest_version then
            update package set latest_version = new_latest_version
            from (
                select version as new_latest_version
                from snapshot
                where package_id = v_package_id and version <> v_latest_version
                order by
                    (regexp_match(version, v_semver_regexp))[1:3]::int[] desc,
                    (regexp_match(version, v_semver_regexp))[4] desc nulls first
                limit 1
            ) as nlv
            where package_id = v_package_id;
        end if;

        -- Delete version snapshot
        delete from snapshot where package_id = v_package_id and version = p_pkg->>'version';
    end if;
end
$$ language plpgsql;
