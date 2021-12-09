-- get_package_views returns the number of views per day for the given package
-- organized by version as a json object.
create or replace function get_package_views(p_package_id uuid)
returns setof json as $$
    with last_month_views as (
        select version, day, total
        from package_views
        where package_id = p_package_id
        and day >= current_date - '1 month'::interval
    )
    select coalesce(json_object_agg(version, (
        select json_object_agg(day, total)
        from last_month_views
        where version = versions.version
    )), '{}')
    from (select distinct(version) from last_month_views) as versions;
$$ language sql;
