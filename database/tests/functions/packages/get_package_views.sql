-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
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
    '1.0.1',
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
insert into package_views values (:'package1ID', '1.0.0', '2021-10-08', 10);
insert into package_views values (:'package1ID', '1.0.0', '2021-12-08', 10);
insert into package_views values (:'package1ID', '1.0.1', '2021-12-08', 20);
insert into package_views values (:'package1ID', '1.0.1', '2021-12-09', 5);
insert into package_views values (:'package2ID', '1.0.0', '2021-10-08', 10);

-- Run some tests
select is(
    get_package_views('00000000-0000-0000-0000-000000000001', '2021-12-01', '2021-12-31')::jsonb,
    '{
        "1.0.0": {
            "2021-12-08": 10
        },
        "1.0.1": {
            "2021-12-08": 20,
            "2021-12-09": 5
        }
    }'::jsonb,
    'Package1 views should be returned as a json object'
);
select is(
    get_package_views('00000000-0000-0000-0000-000000000002', '2021-12-01', '2021-12-31')::jsonb,
    '{}'::jsonb,
    'Package2 has no views during the last month, empty object expected'
);
select is(
    get_package_views('00000000-0000-0000-0000-000000000003', '2021-12-01', '2021-12-31')::jsonb,
    '{}'::jsonb,
    'Package3 does not exist, empty object expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
