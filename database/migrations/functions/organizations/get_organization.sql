-- get_organization returns the organization requested as a json object if the
-- user id provided belongs to the organization.
create or replace function get_organization(p_user_id uuid, p_org_name text)
returns setof json as $$
    select json_build_object(
        'name', o.name,
        'display_name', o.display_name,
        'description', o.description,
        'home_url', o.home_url
    )
    from organization o
    join user__organization uo using (organization_id)
    where o.name = p_org_name
    and uo.user_id = p_user_id
    and uo.confirmed = true;
$$ language sql;
