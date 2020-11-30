-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set org3ID '00000000-0000-0000-0000-000000000003'

-- Seed some data
insert into organization (
    organization_id,
    name,
    authorization_enabled,
    predefined_policy,
    custom_policy,
    policy_data
) values (
    :'org1ID',
    'org1',
    true,
    'rbac.v1',
    null,
    '{"k1": "v1"}'
);
insert into organization (
    organization_id,
    name,
    authorization_enabled,
    predefined_policy,
    custom_policy,
    policy_data
) values (
    :'org2ID',
    'org2',
    true,
    null,
    'org2 custom policy',
    '{"k2": "v2"}'
);
insert into organization (
    organization_id,
    name,
    authorization_enabled,
    predefined_policy,
    custom_policy,
    policy_data
) values (
    :'org3ID',
    'org3',
    false,
    null,
    'org3 custom policy',
    '{"k3": "v3"}'
);

-- Run some tests
select is(
    get_authorization_policies()::jsonb,
    '{
        "org1": {
            "authorization_enabled": true,
            "predefined_policy": "rbac.v1",
            "policy_data": {"k1": "v1"}
        },
        "org2": {
            "authorization_enabled": true,
            "custom_policy": "org2 custom policy",
            "policy_data": {"k2": "v2"}
        }
    }'::jsonb,
    'Enabled organizations authorization policies are returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
