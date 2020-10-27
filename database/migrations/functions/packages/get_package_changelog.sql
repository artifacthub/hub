-- get_package_changelog returns the changelog of the package identified by the
-- id provided as a json array.
create or replace function get_package_changelog(p_package_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'version', version,
        'created_at', floor(extract(epoch from created_at)),
        'changes', changes
    )), '[]')
    from (
        select version, created_at, changes
        from snapshot
        where package_id = p_package_id
        order by created_at desc
    ) sc;
$$ language sql;
