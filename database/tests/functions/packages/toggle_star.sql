-- Start transaction and plan tests
begin;
select plan(6);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    latest_version,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'Package 1',
    'Package 1',
    'description',
    'home_url',
    '1.0.0',
    0,
    :'repo1ID'
);

-- Run some tests
select is_empty(
    $$
        select * from user_starred_package
        where user_id = '00000000-0000-0000-0000-000000000001'
        and package_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'No starred packages yet'
);
select results_eq(
    $$
        select stars from package
        where package_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'values (0)',
    'Package1 stars should be 0 as it has never been starred'
);
select toggle_star(:'user1ID', :'package1ID');
select isnt_empty(
    $$
        select * from user_starred_package
        where user_id = '00000000-0000-0000-0000-000000000001'
        and package_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'Package1 has been starred by user1'
);
select results_eq(
    $$
        select stars from package
        where package_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'values (1)',
    'Package1 stars should be 1 as it has just been starred'
);
select toggle_star(:'user1ID', :'package1ID');
select is_empty(
    $$
        select * from user_starred_package
        where user_id = '00000000-0000-0000-0000-000000000001'
        and package_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User1 star for package1 should have been removed'
);
select results_eq(
    $$
        select stars from package
        where package_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'values (0)',
    'Package1 stars should be 0 as its only star was just removed'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
