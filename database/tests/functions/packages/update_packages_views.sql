-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set lockKey 1
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
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
insert into snapshot (
    package_id,
    version
) values (
    :'package1ID',
    '1.0.0'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package1ID',
    '1.0.1'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'pkg2',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package2ID',
    '1.0.0'
);

-- Run some tests
select update_packages_views(:lockKey, '[
    ["00000000-0000-0000-0000-000000000001", "1.0.0", "2021-12-3", 10]
]');
select results_eq(
    'select * from package_views',
    $$ values
        ('00000000-0000-0000-0000-000000000001'::uuid, '1.0.0', '2021-12-3'::date, 10)
    $$,
    'First run: one insert'
);
select update_packages_views(:lockKey, '[
    ["00000000-0000-0000-0000-000000000001", "1.0.0", "2021-12-3", 10]
]');
select results_eq(
    'select * from package_views',
    $$ values
        ('00000000-0000-0000-0000-000000000001'::uuid, '1.0.0', '2021-12-3'::date, 20)
    $$,
    'Second run: one update'
);
select update_packages_views(:lockKey, '[
    ["00000000-0000-0000-0000-000000000001", "1.0.0", "2021-12-5", 10],
    ["00000000-0000-0000-0000-000000000001", "1.0.1", "2021-12-5", 10],
    ["00000000-0000-0000-0000-000000000002", "1.0.0", "2021-12-5", 10],
    ["00000000-0000-0000-0000-000000000002", "1.0.0", "2021-12-6", 5]
]');
select results_eq(
    'select * from package_views',
    $$ values
        ('00000000-0000-0000-0000-000000000001'::uuid, '1.0.0', '2021-12-3'::date, 20),
        ('00000000-0000-0000-0000-000000000001'::uuid, '1.0.0', '2021-12-5'::date, 10),
        ('00000000-0000-0000-0000-000000000001'::uuid, '1.0.1', '2021-12-5'::date, 10),
        ('00000000-0000-0000-0000-000000000002'::uuid, '1.0.0', '2021-12-5'::date, 10),
        ('00000000-0000-0000-0000-000000000002'::uuid, '1.0.0', '2021-12-6'::date, 5)
    $$,
    'Third run: one update and four inserts'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
