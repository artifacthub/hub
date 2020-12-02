-- get_authorization_policies returns all organizations authorization policies
-- that are enabled as a json object.
create or replace function get_authorization_policies()
returns setof json as $$
    select json_object_agg(
        name, json_strip_nulls(json_build_object(
            'authorization_enabled', authorization_enabled,
            'predefined_policy', predefined_policy,
            'custom_policy', custom_policy,
            'policy_data', policy_data
        ))
    )
    from organization
    where authorization_enabled = true;
$$ language sql;
