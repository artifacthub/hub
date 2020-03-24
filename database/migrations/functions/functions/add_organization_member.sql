-- add_organization_member adds a member to the provided organization.
create or replace function add_organization_member(
    p_requesting_user_id uuid,
    p_org_name text,
    p_user_alias text
) returns void as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    insert into user__organization (
        user_id, organization_id
    ) values (
        (select user_id from "user" where alias = p_user_alias),
        (select organization_id from organization where name = p_org_name)
    );
end
$$ language plpgsql;
