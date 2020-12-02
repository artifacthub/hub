-- get_authorization_policy returns the authorization policy of the
-- organization provided as a json object.
create or replace function get_authorization_policy(p_requesting_user_id uuid, p_org_name text)
returns setof json as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    return query
    select json_strip_nulls(json_build_object(
        'authorization_enabled', authorization_enabled,
        'predefined_policy', predefined_policy,
        'custom_policy', custom_policy,
        'policy_data', policy_data
    ))
    from organization
    where name = p_org_name;
end
$$ language plpgsql;
