-- update_authorization_policy updates the organization's authorization policy
-- in the database if the user provided belongs to the organization.
create or replace function update_authorization_policy(
    p_requesting_user_id uuid,
    p_org_name text,
    p_policy jsonb
)
returns void as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    update organization set
        authorization_enabled = (p_policy->>'authorization_enabled')::boolean,
        predefined_policy = nullif(p_policy->>'predefined_policy', ''),
        custom_policy = nullif(p_policy->>'custom_policy', ''),
        policy_data = nullif(p_policy->>'policy_data', '')::jsonb
    where name = p_org_name;
end
$$ language plpgsql;
