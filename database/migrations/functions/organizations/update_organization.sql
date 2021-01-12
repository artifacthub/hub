-- update_organization updates the provided organization in the database if the
-- user provided belongs to the organization.
create or replace function update_organization(p_requesting_user_id uuid, p_org_name text, p_org jsonb)
returns void as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    update organization set
        name = p_org->>'name',
        display_name = nullif(p_org->>'display_name', ''),
        description = nullif(p_org->>'description', ''),
        home_url = nullif(p_org->>'home_url', ''),
        logo_image_id = nullif(p_org->>'logo_image_id', '')::uuid
    where name = p_org_name;
end
$$ language plpgsql;
