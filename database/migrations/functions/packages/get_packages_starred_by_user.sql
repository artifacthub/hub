-- get_packages_starred_by_user returns the packages starred by the user as a
-- json array.
create or replace function get_packages_starred_by_user(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(pkgJSON), '[]')
    from (
        select pkgJSON
        from package p
        join user_starred_package usp using (package_id)
        cross join get_package_summary(p.package_id) as pkgJSON
        where usp.user_id = p_user_id
        order by p.name asc
    ) pkgs;
$$ language sql;
