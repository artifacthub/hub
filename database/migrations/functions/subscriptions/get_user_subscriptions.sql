-- get_user_subscriptions returns all the subscriptions for the provided user
-- as a json array.
create or replace function get_user_subscriptions(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_strip_nulls(json_build_object(
        'package_id', package_id,
        'name', name,
        'normalized_name', normalized_name,
        'logo_image_id', logo_image_id,
        'repository', (select get_repository_summary(repository_id)),
        'event_kinds', (
            select json_agg(distinct(event_kind_id))
            from subscription
            where package_id = sp.package_id
            and user_id = p_user_id
        )
    ))), '[]')
    from (
        select
            p.package_id,
            p.name,
            p.normalized_name,
            s.logo_image_id,
            r.repository_id
        from package p
        join repository r using (repository_id)
        join snapshot s on s.package_id = p.package_id and s.version = p.latest_version
        where p.package_id in (
            select distinct(package_id) from subscription where user_id = p_user_id
        )
        order by p.normalized_name asc
    ) sp;
$$ language sql;
