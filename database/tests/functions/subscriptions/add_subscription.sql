-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
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

-- Add subscription
select add_subscription('
{
    "user_id": "00000000-0000-0000-0000-000000000001",
    "package_id": "00000000-0000-0000-0000-000000000001",
    "notification_kind": 0
}
'::jsonb);

-- Check if subscription was added successfully
select results_eq(
    $$
        select
            user_id,
            package_id,
            notification_kind_id
        from subscription
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            0
        )
    $$,
    'Subscription should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
