-- get_user_organizations returns the organizations the provided user belongs
-- to as a json array.
create or replace function get_user_organizations(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_strip_nulls(json_build_object(
        'name', o.name,
        'display_name', o.display_name,
        'description', o.description,
        'home_url', o.home_url,
        'logo_image_id', o.logo_image_id,
        'confirmed', o.confirmed,
        'members_count', (
            select count(*)
            from user__organization
            where organization_id = o.organization_id
            and confirmed = true
        )
    ))), '[]')
    from (
        select o.*, uo.confirmed
        from organization o
        join user__organization uo using (organization_id)
        where uo.user_id = p_user_id
        order by o.name asc
    ) o;
$$ language sql;
