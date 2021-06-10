-- get_user_subscriptions returns all the subscriptions for the provided user
-- as a json array.
create or replace function get_user_subscriptions(p_user_id uuid, p_limit int, p_offset int)
returns table(data json, total_count bigint) as $$
    with user_subscriptions as (
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
    )
    select
        coalesce(json_agg(json_strip_nulls(json_build_object(
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
        ))), '[]'),
        (select count(*) from user_subscriptions)
    from (
        select *
        from user_subscriptions
        order by normalized_name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) sp;
$$ language sql;
