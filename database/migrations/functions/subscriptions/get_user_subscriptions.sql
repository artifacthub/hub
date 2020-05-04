-- get_user_subscriptions returns all the subscriptions for the provided user
-- as a json array.
create or replace function get_user_subscriptions(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'package_id', package_id,
        'kind', package_kind_id,
        'name', name,
        'normalized_name', normalized_name,
        'logo_image_id', logo_image_id,
        'user_alias', user_alias,
        'organization_name', organization_name,
        'organization_display_name', organization_display_name,
        'chart_repository', (select nullif(
            jsonb_build_object(
                'name', chart_repository_name,
                'display_name', chart_repository_display_name
            ),
            '{"name": null, "display_name": null}'::jsonb
        )),
        'notification_kinds', (
            select json_agg(distinct(notification_kind_id))
            from subscription
            where package_id = sp.package_id
            and user_id = p_user_id
        )
    )), '[]')
    from (
        select
            p.package_id,
            p.package_kind_id,
            p.name,
            p.normalized_name,
            p.logo_image_id,
            u.alias as user_alias,
            o.name as organization_name,
            o.display_name as organization_display_name,
            r.name as chart_repository_name,
            r.display_name as chart_repository_display_name
        from package p
        left join chart_repository r using (chart_repository_id)
        left join "user" u on p.user_id = u.user_id or r.user_id = u.user_id
        left join organization o
            on p.organization_id = o.organization_id or r.organization_id = o.organization_id
        where p.package_id in (
            select distinct(package_id) from subscription where user_id = p_user_id
        )
        order by p.normalized_name asc
    ) sp;
$$ language sql;
