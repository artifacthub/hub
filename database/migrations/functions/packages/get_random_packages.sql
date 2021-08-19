-- get_random_packages returns some random packages as a json object.
create or replace function get_random_packages()
returns setof json as $$
    select coalesce(json_agg(pkgJSON), '[]')
    from (
        select p.package_id
        from package p tablesample system_rows(1000)
        join snapshot s using (package_id)
        where s.version = p.latest_version
        and (s.deprecated is null or s.deprecated = false)
        and s.readme is not null
        and s.ts between current_timestamp - '6 months'::interval and current_timestamp
        order by random() limit 10
    ) rp
    cross join get_package_summary(jsonb_build_object('package_id', rp.package_id)) as pkgJSON;
$$ language sql;
