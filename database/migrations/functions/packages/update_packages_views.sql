-- update_packages_views updates the views of the packages provided.
create or replace function update_packages_views(p_lock_key bigint, p_data jsonb)
returns void as $$
    -- Make sure only one batch of updates is processed at a time
    select pg_advisory_xact_lock(p_lock_key);

    -- Insert or update the corresponding views counters as needed
    insert into package_views (package_id, version, day, total)
    select views_batch.*
    from (
        select
            (value->>0)::uuid as package_id,
            (value->>1)::text as version,
            (value->>2)::date as day,
            (value->>3)::integer as total
        from jsonb_array_elements(p_data)
    ) as views_batch
    join snapshot s on s.package_id = views_batch.package_id and s.version = views_batch.version
    on conflict (package_id, version, day) do
    update set total = package_views.total + excluded.total;
$$ language sql;
