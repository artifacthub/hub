-- get_stats returns some stats formatted as json.
create or replace function get_stats()
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'generated_at', floor(extract(epoch from current_timestamp)*1000),
        'packages', json_build_object(
            'total', (select count(*) from package),
            'running_total', (
                select json_agg(json_build_array(extract(epoch from date)*1000, running_total))
                from (
                    select date, sum(total) over (order by date asc) as running_total
                    from (
                        select date(created_at), count(*) as total
                        from package
                        group by date
                    ) dt
                ) rt
            ),
            'created_monthly', (
                select json_agg(json_build_array(extract(epoch from date)*1000, total))
                from (
                    select
                        make_date(
                            extract(year from created_at)::int,
                            extract(month from created_at)::int,
                            1::int
                        ) as date,
                        count(*) as total
                    from package
                    group by date
                    order by date asc
                ) dt
            ),
            'views_daily', (
                select json_agg(json_build_array(extract(epoch from day)*1000, total))
                from (
                    select day, sum(total) as total
                    from package_views
                    where day >= current_date - '1 month'::interval
                    group by day
                    order by day asc
                ) dt
            ),
            'views_monthly', (
                select json_agg(json_build_array(extract(epoch from month)*1000, total))
                from (
                    select date_trunc('month', day) as month, sum(total) as total
                    from package_views
                    where day >= current_date - '2 year'::interval
                    group by month
                    order by month asc
                ) mt
            ),
            'top_views_today', (
                select json_agg(json_build_object(
                    'package', package,
                    'views', total
                ))
                from (
                    select
                        get_package_summary(jsonb_build_object('package_id', package_id)) as package,
                        sum(total) as total
                    from package_views
                    where day = current_date
                    and package_id is not null
                    group by package_id
                    order by total desc
                    limit 10
                ) views_today
            ),
            'top_views_current_month', (
                select json_agg(json_build_object(
                    'package', package,
                    'views', total
                ))
                from (
                    select
                        get_package_summary(jsonb_build_object('package_id', package_id)) as package,
                        sum(total) as total
                    from package_views
                    where date_trunc('year', day::timestamp) = date_trunc('year', current_timestamp)
                    and date_trunc('month', day::timestamp) = date_trunc('month', current_timestamp)
                    and package_id is not null
                    group by package_id
                    order by total desc
                    limit 10
                ) views_current_month
            )
        ),
        'snapshots', json_build_object(
            'total', (select count(*) from snapshot),
            'running_total', (
                select json_agg(json_build_array(extract(epoch from date)*1000, running_total))
                from (
                    select date, sum(total) over (order by date asc) as running_total
                    from (
                        select date(created_at), count(*) as total
                        from snapshot
                        group by date
                    ) dt
                ) rt
            ),
            'created_monthly', (
                select json_agg(json_build_array(extract(epoch from date)*1000, total))
                from (
                    select
                        make_date(
                            extract(year from created_at)::int,
                            extract(month from created_at)::int,
                            1::int
                        ) as date,
                        count(*) as total
                    from snapshot
                    group by date
                    order by date asc
                ) dt
            )
        ),
        'repositories', json_build_object(
            'total', (select count(*) from repository),
            'running_total', (
                select json_agg(json_build_array(extract(epoch from date)*1000, running_total))
                from (
                    select date, sum(total) over (order by date asc) as running_total
                    from (
                        select date(created_at), count(*) as total
                        from repository
                        group by date
                    ) dt
                ) rt
            )
        ),
        'organizations', json_build_object(
            'total', (select count(*) from organization),
            'running_total', (
                select json_agg(json_build_array(extract(epoch from date)*1000, running_total))
                from (
                    select date, sum(total) over (order by date asc) as running_total
                    from (
                        select date(created_at), count(*) as total
                        from organization
                        group by date
                    ) dt
                ) rt
            )
        ),
        'users', json_build_object(
            'total', (select count(*) from "user"),
            'running_total', (
                select json_agg(json_build_array(extract(epoch from date)*1000, running_total))
                from (
                    select date, sum(total) over (order by date asc) as running_total
                    from (
                        select date(created_at), count(*) as total
                        from "user"
                        group by date
                    ) dt
                ) rt
            )
        )
    ));
$$ language sql;
