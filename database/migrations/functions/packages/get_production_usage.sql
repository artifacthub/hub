-- get_production_usage returns which of the organizations the user belongs to
-- are using the provided package in production.
create or replace function get_production_usage(p_user_id uuid, p_repo_name text, p_pkg_name text)
returns setof json as $$
    select coalesce(json_agg(json_strip_nulls(json_build_object(
        'name', o.name,
        'display_name', o.display_name,
        'home_url', o.home_url,
        'logo_image_id', o.logo_image_id,
        'used_in_production', (select exists (
            select 1 from production_usage
            where package_id = (
                select package_id
                from package p
                join repository r using (repository_id)
                where r.name = p_repo_name
                and p.name = p_pkg_name
            )
            and organization_id = o.organization_id
        ))
    ))), '[]')
    from (
        select o.organization_id, o.name, o.display_name, o.home_url, o.logo_image_id
        from organization o
        join user__organization uo using (organization_id)
        where uo.user_id = p_user_id
        and uo.confirmed = true
        order by o.name asc
    ) o;
$$ language sql;
