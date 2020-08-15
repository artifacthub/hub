-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set user3ID '00000000-0000-0000-0000-000000000003'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into "user" (user_id, alias, email)
values (:'user3ID', 'user3', 'user3@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 0);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user2ID', :'package1ID', 0);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user3ID', :'package1ID', 1);

-- Run some tests
select is(
    get_package_subscriptors(:'package1ID', 0)::jsonb,
    '[
        {
            "user_id": "00000000-0000-0000-0000-000000000001"
        },
        {
            "user_id": "00000000-0000-0000-0000-000000000002"
        }
    ]'::jsonb,
    'Two subscriptors expected for package1 and kind new releases'
);
select is(
    get_package_subscriptors(:'package2ID', 0)::jsonb,
    '[]'::jsonb,
    'No subscriptors expected for package2 and kind new releases'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
