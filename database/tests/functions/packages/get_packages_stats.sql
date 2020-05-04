-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- No packages at this point
select is(
    get_packages_stats()::jsonb,
    '{
        "packages": 0,
        "releases": 0
    }'::jsonb,
    'Empty stats are returned as a json object'
);

-- Seed some packages
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'image1ID',
    0,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    home_url,
    app_version,
    digest,
    readme
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    'home_url',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    home_url,
    app_version,
    digest,
    readme
) values (
    :'package1ID',
    '0.0.9',
    'Package 1',
    'description',
    'home_url',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme'
);
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    chart_repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'image2ID',
    0,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    home_url,
    app_version,
    digest,
    readme
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    'home_url',
    '12.1.0',
    'digest-package2-1.0.0',
    'readme'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    home_url,
    app_version,
    digest,
    readme
) values (
    :'package2ID',
    '0.0.9',
    'Package 2',
    'description',
    'home_url',
    '12.0.0',
    'digest-package2-0.0.9',
    'readme'
);

-- Some packages have just been seeded
select is(
    get_packages_stats()::jsonb,
    '{
        "packages": 2,
        "releases": 4
    }'::jsonb,
    'Stats are returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
