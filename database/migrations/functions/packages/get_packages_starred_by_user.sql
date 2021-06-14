-- get_packages_starred_by_user returns the packages starred by the user as a
-- json array.
create or replace function get_packages_starred_by_user(p_user_id uuid, p_limit int, p_offset int)
returns table(data json, total_count bigint) as $$
    with user_starred_packages as (
        select p.package_id, p.name
        from package p
        join user_starred_package usp using (package_id)
        where usp.user_id = p_user_id
    )
    select
        coalesce(json_agg(pkgJSON), '[]'),
        (select count(*) from user_starred_packages)
    from (
        select pkgJSON
        from user_starred_packages usp
        cross join get_package_summary(jsonb_build_object('package_id', usp.package_id)) as pkgJSON
        order by usp.name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) ps
$$ language sql;
