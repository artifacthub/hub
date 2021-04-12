-- get_packages_starred_by_user returns the packages starred by the user as a
-- json array.
create or replace function get_packages_starred_by_user(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(pkgJSON), '[]')
    from (
        select p.package_id
        from package p
        join user_starred_package usp using (package_id)
        where usp.user_id = p_user_id
        order by p.name asc
    ) ps
    cross join get_package_summary(jsonb_build_object('package_id', ps.package_id)) as pkgJSON;
$$ language sql;
