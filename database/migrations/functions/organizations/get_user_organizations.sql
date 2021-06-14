-- get_user_organizations returns the organizations the provided user belongs
-- to as a json array.
create or replace function get_user_organizations(p_user_id uuid, p_limit int, p_offset int)
returns table(data json, total_count bigint) as $$
    with user_organizations as (
        select o.*, uo.confirmed
        from organization o
        join user__organization uo using (organization_id)
        where uo.user_id = p_user_id
    )
    select
        coalesce(json_agg(json_strip_nulls(json_build_object(
            'name', name,
            'display_name', display_name,
            'description', description,
            'home_url', home_url,
            'logo_image_id', logo_image_id,
            'confirmed', o.confirmed,
            'members_count', (
                select count(*)
                from user__organization
                where organization_id = o.organization_id
                and confirmed = true
            )
        ))), '[]'),
        (select count(*) from user_organizations)
    from (
        select *
        from user_organizations
        order by name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) o;
$$ language sql;
