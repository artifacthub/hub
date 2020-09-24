-- delete_organization_member deletes a member from the provided organization.
create or replace function delete_organization_member(
    p_requesting_user_id uuid,
    p_org_name text,
    p_user_alias text
) returns void as $$
declare
    v_users_in_organization int;
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    -- Last member of an organization cannot leave it
    select count(*) into v_users_in_organization
    from user__organization uo
    join organization o using (organization_id)
    where o.name = p_org_name;
    if v_users_in_organization = 1 then
        raise 'last member of an organization cannot leave it';
    end if;

    -- Delete member from organization
    delete from user__organization
    where user_id = (select user_id from "user" where alias = p_user_alias)
    and organization_id = (select organization_id from organization where name = p_org_name);

    -- Delete user opt-out entries for repositories belonging to the org
    delete from opt_out
    where user_id = (select user_id from "user" where alias = p_user_alias)
    and repository_id in (
        select repository_id
        from repository r
        join organization o using (organization_id)
        where o.name = p_org_name
    );
end
$$ language plpgsql;
