-- get_package_changelog returns the changelog of the package identified by the
-- id provided as a json array.
create or replace function get_package_changelog(p_package_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_strip_nulls(json_build_object(
        'version', version,
        'ts', floor(extract(epoch from ts)),
        'changes', changes,
        'contains_security_updates', contains_security_updates,
        'prerelease', prerelease
    ))), '[]')
    from (
        select version, ts, changes, contains_security_updates, prerelease
        from snapshot
        where package_id = p_package_id
        and changes is not null
        order by ts desc
    ) sc;
$$ language sql;
