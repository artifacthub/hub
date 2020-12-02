-- get_organization returns the organization requested as a json object.
create or replace function get_organization(p_org_name text)
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'name', o.name,
        'display_name', o.display_name,
        'description', o.description,
        'home_url', o.home_url,
        'logo_image_id', o.logo_image_id
    ))
    from organization o
    where o.name = p_org_name;
$$ language sql;
