-- confirm_organization_membership confirms a user's membership to the provided
-- organization.
create or replace function confirm_organization_membership(p_user_id uuid, p_org_name text)
returns void as $$
begin
    update user__organization
    set confirmed = true
    where user_id = p_user_id
    and organization_id = (select organization_id from organization where name = p_org_name)
    and confirmed = false;

    if not found then
        raise 'organization membership confirmation failed';
    end if;
end
$$ language plpgsql;
