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

-- Update authorization policy and run some tests
select update_authorization_policy(:'user1ID', 'org1', '{
    "authorization_enabled": false,
    "predefined_policy": null,
    "custom_policy": "org1 custom policy",
    "policy_data": {"k2": "v2"}
}');
select results_eq(
    $$
        select
            authorization_enabled,
            predefined_policy,
            custom_policy,
            policy_data
        from organization
    $$,
    $$
        values (
            false,
            null,
            'org1 custom policy',
            '{"k2": "v2"}'::jsonb
        )
    $$,
    'Organization authorization should have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
