-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into package (
    package_id,
    name,
    latest_version,
    package_kind_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    1
);
insert into subscription (user_id, package_id, notification_kind_id)
values (:'user1ID', :'package1ID', 0);

-- Run some tests
select is(
    get_package_subscriptions(:'user1ID', :'package1ID')::jsonb,
    '[{
        "notification_kind": 0
    }]'::jsonb,
    'A subscription with notification kind 0 should be returned'
);
select is(
    get_package_subscriptions(:'user2ID', :'package1ID')::jsonb,
    '[]'::jsonb,
    'No subscriptions should be returned for user2 and package1'
);
select is(
    get_package_subscriptions(:'user1ID', :'package2ID')::jsonb,
    '[]'::jsonb,
    'No subscriptions should be returned for user1 and package2'
);


-- Finish tests and rollback transaction
select * from finish();
rollback;
