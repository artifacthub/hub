-- user_belongs_to_organization checks if a user belongs to the provided
-- organization.
create or replace function user_belongs_to_organization(p_user_id uuid, p_org_name text)
returns boolean as $$
    select exists (
        select user_id
        from organization o
        join user__organization uo using (organization_id)
        where o.name = p_org_name
        and uo.user_id = p_user_id
        and uo.confirmed = true
    );
$$ language sql;
