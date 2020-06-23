-- Start transaction and plan tests
begin;
select plan(10);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set maintainer1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (package_id, version) values (:'package1ID', '1.0.0');
insert into snapshot (package_id, version) values (:'package1ID', '0.0.9');
insert into snapshot (package_id, version) values (:'package1ID', '0.0.9-rc2');
insert into snapshot (package_id, version) values (:'package1ID', '0.0.9-rc1');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer1ID', 'name1', 'email1');
insert into package__maintainer (package_id, maintainer_id)
values (:'package1ID', :'maintainer1ID');

-- Run some tests
select unregister_package('
{
    "kind": 0,
    "name": "package1",
    "version": "1.0.0",
    "repository": {
        "repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');
select results_eq(
    $$ select latest_version from package where name='package1' $$,
    $$ values ('0.0.9') $$,
    'Package last version should have been updated to 0.0.9'
);
select is_empty(
    $$ select * from snapshot where version='1.0.0' $$,
    'Package snapshot version 1.0.0 should have been deleted'
);
select unregister_package('
{
    "kind": 0,
    "name": "package1",
    "version": "0.0.9",
    "repository": {
        "repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');
select results_eq(
    $$ select latest_version from package where name='package1' $$,
    $$ values ('0.0.9-rc2') $$,
    'Package last version should have been updated to 0.0.9-rc2'
);
select is_empty(
    $$ select * from snapshot where version='0.0.9' $$,
    'Package snapshot version 0.0.9 should have been deleted'
);
select unregister_package('
{
    "kind": 0,
    "name": "package1",
    "version": "0.0.9-rc1",
    "repository": {
        "repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');
select results_eq(
    $$ select latest_version from package where name='package1' $$,
    $$ values ('0.0.9-rc2') $$,
    'Package last version should still be 0.0.9-rc2'
);
select is_empty(
    $$ select * from snapshot where version='0.0.9-rc1' $$,
    'Package snapshot version 0.0.9-rc1 should have been deleted'
);
select unregister_package('
{
    "kind": 0,
    "name": "package1",
    "version": "0.0.9-rc2",
    "repository": {
        "repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');
select is_empty(
    $$ select * from package $$,
    'Package should have been deleted'
);
select is_empty(
    $$ select * from package $$,
    'All package snapshots should have been deleted'
);
select is_empty(
    $$ select * from package__maintainer $$,
    'Package maintainer should have been deleted'
);
select is_empty(
    $$ select * from maintainer $$,
    'Orphan maintainer should have been deleted'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
