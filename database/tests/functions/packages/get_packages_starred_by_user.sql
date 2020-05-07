-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    stars,
    package_kind_id,
    organization_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'image1ID',
    10,
    1,
    :'org1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    app_version,
    digest,
    readme
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    app_version,
    digest,
    readme
) values (
    :'package1ID',
    '0.0.9',
    'Package 1',
    'description',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme'
);
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    stars,
    package_kind_id,
    organization_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'image2ID',
    11,
    1,
    :'org1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    app_version,
    digest,
    readme,
    deprecated
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    '12.1.0',
    'digest-package2-1.0.0',
    'readme',
    true
);
insert into user_starred_package (user_id, package_id) values (:'user1ID', :'package1ID');

-- Run some tests
select is(
    get_packages_starred_by_user(:'user1ID')::jsonb,
    '[{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 1,
        "name": "package1",
        "normalized_name": "package1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "stars": 10,
        "display_name": "Package 1",
        "description": "description",
        "version": "1.0.0",
        "app_version": "12.1.0",
        "deprecated": null,
        "user_alias": null,
        "organization_name": "org1",
        "organization_display_name": "Organization 1",
        "chart_repository": null
    }]'::jsonb,
    'Package1 expected as is the only package starred by user1'
);
select is(
    get_packages_starred_by_user(:'user2ID')::jsonb,
    '[]'::jsonb,
    'User2 has no starred packages'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
