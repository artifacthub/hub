-- add_organization adds the provided organization to the database.
create or replace function add_organization(p_user_id uuid, p_org jsonb)
returns void as $$
declare
    v_org_id uuid;
begin
    -- Register organization
    insert into organization (
        name,
        display_name,
        description,
        home_url,
        logo_image_id
    ) values (
        p_org->>'name',
        nullif(p_org->>'display_name', ''),
        nullif(p_org->>'description', ''),
        nullif(p_org->>'home_url', ''),
        nullif(p_org->>'logo_image_id', '')::uuid
    ) returning organization_id into v_org_id;

    -- Add user who created the organization to it
    insert into user__organization (user_id, organization_id, confirmed)
    values (p_user_id, v_org_id, true);
end
$$ language plpgsql;
