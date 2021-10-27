-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some users and organizations
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'pkg1',
    '1.0.0',
    :'repo1ID'
);
insert into production_usage (package_id, organization_id) values (:'package1ID', :'org1ID');

-- Run some tests
select isnt_empty(
    $$
        select * from production_usage
        where package_id = '00000000-0000-0000-0000-000000000001'
        and organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'Org1 should be a production user of repo1/pkg1'
);
select throws_ok(
    $$ select delete_production_usage('00000000-0000-0000-0000-000000000002', 'repo1', 'pkg1', 'org1') $$,
    42501,
    'insufficient_privilege',
    'User2 should not be able to delete org1 from the list of production users of repo1/pkg1'
);
select delete_production_usage('00000000-0000-0000-0000-000000000001', 'repo1', 'pkg1', 'org1');
select is_empty(
    $$
        select * from production_usage
        where package_id = '00000000-0000-0000-0000-000000000001'
        and organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'Org1 should now NOT be a production user of repo1/pkg1'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
