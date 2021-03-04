-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'


-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    stars,
    repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    10,
    :'repo1ID'
);
insert into user_starred_package(user_id, package_id) values (:'user1ID', :'package1ID');


-- Run some tests
select is(
    get_package_stars(null, :'package1ID')::jsonb,
    '{
        "stars": 10
    }'::jsonb,
    'package stars expected, starred_by_user field not expected as user_id provided is null'
);
select is(
    get_package_stars(:'user1ID', :'package1ID')::jsonb,
    '{
        "stars": 10,
        "starred_by_user": true
    }'::jsonb,
    'package stars expected, starred_by_user should be true'
);
select is(
    get_package_stars(:'user2ID', :'package1ID')::jsonb,
    '{
        "stars": 10,
        "starred_by_user": false
    }'::jsonb,
    'package stars expected, starred_by_user should be false'
);
select is(
    get_package_stars(:'user2ID', :'package2ID')::jsonb,
    '{
        "starred_by_user": false
    }'::jsonb,
    'package stars not expected and starred_by_user expected to be false as package does not exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
