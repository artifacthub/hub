-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
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
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);

-- Run some tests
select is(
    get_authorization_policy(:'user1ID', 'org1')::jsonb,
    '{
        "authorization_enabled": true,
        "predefined_policy": "rbac.v1",
        "policy_data": {"k1": "v1"}
    }'::jsonb,
    'Organizations authorization policy is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
