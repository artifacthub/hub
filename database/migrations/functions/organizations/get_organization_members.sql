-- get_organization_members returns the members of the organization provided as
-- a json array.
create or replace function get_organization_members(p_requesting_user_id uuid, p_org_name text)
returns setof json as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    return query
    select json_agg(json_strip_nulls(json_build_object(
        'alias', u.alias,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'confirmed', u.confirmed
    )))
    from (
        select u.alias, u.first_name, u.last_name, uo.confirmed
        from "user" u
        join user__organization uo using (user_id)
        join organization o using (organization_id)
        where o.name = p_org_name
        order by u.first_name, u.last_name asc
    ) u;
end
$$ language plpgsql;
