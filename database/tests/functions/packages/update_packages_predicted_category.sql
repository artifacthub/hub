-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set package4ID '00000000-0000-0000-0000-000000000004'
\set package5ID '00000000-0000-0000-0000-000000000005'
\set package6ID '00000000-0000-0000-0000-000000000006'
\set package7ID '00000000-0000-0000-0000-000000000007'
\set package8ID '00000000-0000-0000-0000-000000000008'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package1ID', 'package1', '1.0.0', 3, 'predicted', :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package2ID', 'package2', '1.0.0', 5, 'predicted', :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package3ID', 'package3', '1.0.0', null, 'predicted', :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package4ID', 'package4', '1.0.0', 1, 'publisher', :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package5ID', 'package5', '1.0.0', null, 'skip', :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package6ID', 'package6', '1.0.0', 7, null, :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package7ID', 'package7', '1.0.0', 2, 'predicted', :'repo1ID');
insert into package (package_id, name, latest_version, package_category_id, package_category_source, repository_id)
values (:'package8ID', 'package8', '2.0.0', 3, 'predicted', :'repo1ID');
select ctid::text as package7_ctid from package where package_id = :'package7ID' \gset

-- Run some tests
select update_packages_predicted_category('[
    {"package_id": "00000000-0000-0000-0000-000000000001", "latest_version": "1.0.0", "category": 4},
    {"package_id": "00000000-0000-0000-0000-000000000002", "latest_version": "1.0.0", "category": 0},
    {"package_id": "00000000-0000-0000-0000-000000000003", "latest_version": "1.0.0", "category": 6},
    {"package_id": "00000000-0000-0000-0000-000000000004", "latest_version": "1.0.0", "category": 2},
    {"package_id": "00000000-0000-0000-0000-000000000005", "latest_version": "1.0.0", "category": 2},
    {"package_id": "00000000-0000-0000-0000-000000000006", "latest_version": "1.0.0", "category": 8},
    {"package_id": "00000000-0000-0000-0000-000000000007", "latest_version": "1.0.0", "category": 2},
    {"package_id": "00000000-0000-0000-0000-000000000008", "latest_version": "1.0.0", "category": 4},
    {"package_id": "00000000-0000-0000-0000-000000000099", "latest_version": "1.0.0", "category": 1}
]');
select results_eq(
    $$
        select package_id, package_category_id, package_category_source
        from package
        order by package_id asc
    $$,
    $$ values
        ('00000000-0000-0000-0000-000000000001'::uuid, 4, 'predicted'),
        ('00000000-0000-0000-0000-000000000002'::uuid, null, 'predicted'),
        ('00000000-0000-0000-0000-000000000003'::uuid, 6, 'predicted'),
        ('00000000-0000-0000-0000-000000000004'::uuid, 1, 'publisher'),
        ('00000000-0000-0000-0000-000000000005'::uuid, null, 'skip'),
        ('00000000-0000-0000-0000-000000000006'::uuid, 7, null),
        ('00000000-0000-0000-0000-000000000007'::uuid, 2, 'predicted'),
        ('00000000-0000-0000-0000-000000000008'::uuid, 3, 'predicted')
    $$,
    'Only predicted categories should have been updated, packages whose latest version has changed and unknown packages should be ignored'
);
select is(
    (select ctid::text from package where package_id = :'package7ID'),
    :'package7_ctid',
    'Packages whose predicted category has not changed should not have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
