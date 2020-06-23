-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');

-- Add subscription
select add_subscription('
{
    "user_id": "00000000-0000-0000-0000-000000000001",
    "package_id": "00000000-0000-0000-0000-000000000001",
    "event_kind": 0
}
'::jsonb);

-- Check if subscription was added successfully
select results_eq(
    $$
        select
            user_id,
            package_id,
            event_kind_id
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
