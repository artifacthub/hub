-- get_organization_members returns the members of the organization provided as
-- a json array.
create or replace function get_organization_members(
    p_requesting_user_id uuid,
    p_org_name text,
    p_limit int,
    p_offset int
) returns table(data json, total_count bigint) as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    return query
    with organization_members as (
        select u.alias, u.first_name, u.last_name, uo.confirmed
        from "user" u
        join user__organization uo using (user_id)
        join organization o using (organization_id)
        where o.name = p_org_name
    )
    select
        coalesce(json_agg(json_strip_nulls(json_build_object(
            'alias', alias,
            'first_name', first_name,
            'last_name', last_name,
            'confirmed', confirmed
        ))), '[]'),
        (select count(*) from organization_members)
    from (
        select *
        from organization_members
        order by first_name, last_name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) u;
end
$$ language plpgsql;
