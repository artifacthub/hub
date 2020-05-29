-- get_packages_updates returns the latest packages added as well as those
-- which have been updated more recently as a json object.
create or replace function get_packages_updates()
returns setof json as $$
    select json_build_object(
        'latest_packages_added', (
            select coalesce(json_agg(pkgJSON), '[]')
            from (
                select pkgJSON
                from package p
                join snapshot s using (package_id)
                cross join get_package_summary(p.package_id) as pkgJSON
                where s.version = p.latest_version
                and (s.deprecated is null or s.deprecated = false)
                order by p.created_at desc limit 5
            ) latest_packages_added
        ),
        'packages_recently_updated', (
            select coalesce(json_agg(pkgJSON), '[]')
            from (
                select pkgJSON
                from package p
                join snapshot s using (package_id)
                cross join get_package_summary(p.package_id) as pkgJSON
                where s.version = p.latest_version
                and (s.deprecated is null or s.deprecated = false)
                order by p.updated_at desc limit 5
            ) packages_recently_updated
        )
    );
$$ language sql;
