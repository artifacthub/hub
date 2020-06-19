-- get_user_subscriptions returns all the subscriptions for the provided user
-- as a json array.
create or replace function get_user_subscriptions(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'package_id', package_id,
        'name', name,
        'normalized_name', normalized_name,
        'logo_image_id', logo_image_id,
        'repository', jsonb_build_object(
            'kind', repository_kind_id,
            'name', repository_name,
            'display_name', repository_display_name,
            'user_alias', user_alias,
            'organization_name', organization_name,
            'organization_display_name', organization_display_name
        ),
        'event_kinds', (
            select json_agg(distinct(event_kind_id))
            from subscription
            where package_id = sp.package_id
            and user_id = p_user_id
        )
    )), '[]')
    from (
        select
            p.package_id,
            p.name,
            p.normalized_name,
            p.logo_image_id,
            r.repository_kind_id,
            r.name as repository_name,
            r.display_name as repository_display_name,
            u.alias as user_alias,
            o.name as organization_name,
            o.display_name as organization_display_name
        from package p
        join repository r using (repository_id)
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where p.package_id in (
            select distinct(package_id) from subscription where user_id = p_user_id
        )
        order by p.normalized_name asc
    ) sp;
$$ language sql;
