-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'
\set image3ID '00000000-0000-0000-0000-000000000003'

-- No packages at this point
select is(
    get_random_packages()::jsonb,
    '[]'::jsonb,
    'No packages in db yet, no packages expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into chart_repository (chart_repository_id, name, display_name, url, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', :'org1ID');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com');
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
    keywords,
    home_url,
    readme,
    deprecated,
    signed,
    created_at
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    '{"kw1", "kw2"}',
    'home_url',
    'readme',
    false,
    false,
    '2020-06-16 11:20:34+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    stars,
    package_kind_id,
    chart_repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    5,
    0,
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    created_at
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'digest-package2-1.0.0',
    'readme',
    '2020-06-16 11:20:34+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    chart_repository_id
) values (
    :'package3ID',
    'package3',
    '1.0.0',
    :'image3ID',
    0,
    :'repo3ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    deprecated,
    signed,
    created_at
) values (
    :'package3ID',
    '1.0.0',
    'Package 3',
    'description',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'digest-package3-1.0.0',
    'readme',
    true,
    true,
    '2020-06-16 11:20:34+02'
);

-- Some packages have just been seeded
select is(
    get_random_packages()::jsonb,
    '[
        {
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 1,
            "name": "package1",
            "normalized_name": "package1",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "stars": 10,
            "display_name": "Package 1",
            "description": "description",
            "version": "1.0.0",
            "app_version": null,
            "deprecated": false,
            "signed": false,
            "created_at": 1592299234,
            "user_alias": null,
            "organization_name": "org1",
            "organization_display_name": "Organization 1",
            "chart_repository": null
        }
    ]'::jsonb,
    'One random package expected (package1)'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
