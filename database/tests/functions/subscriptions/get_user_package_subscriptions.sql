-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 0);

-- Run some tests
select is(
    get_user_package_subscriptions(:'user1ID', :'package1ID')::jsonb,
    '[{
        "event_kind": 0
    }]'::jsonb,
    'A subscription with event kind 0 should be returned'
);
select is(
    get_user_package_subscriptions(:'user2ID', :'package1ID')::jsonb,
    '[]'::jsonb,
    'No subscriptions should be returned for user2 and package1'
);
select is(
    get_user_package_subscriptions(:'user1ID', :'package2ID')::jsonb,
    '[]'::jsonb,
    'No subscriptions should be returned for user1 and package2'
);


-- Finish tests and rollback transaction
select * from finish();
rollback;
