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
\set package4ID '00000000-0000-0000-0000-000000000004'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'
\set image3ID '00000000-0000-0000-0000-000000000003'
\set image4ID '00000000-0000-0000-0000-000000000004'

-- No packages at this point
select is(
    get_random_packages()::jsonb,
    '[]'::jsonb,
    'No packages in db yet, no packages expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', 0, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    stars,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    10,
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    readme,
    deprecated,
    signed,
    ts
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    :'image1ID',
    '{"kw1", "kw2"}',
    'home_url',
    'readme',
    false,
    false,
    current_timestamp - '3 months'::interval
);
insert into package (
    package_id,
    name,
    latest_version,
    stars,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    5,
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
    ts
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
    repository_id
) values (
    :'package3ID',
    'package3',
    '1.0.0',
    :'repo3ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    deprecated,
    signed,
    ts
) values (
    :'package3ID',
    '1.0.0',
    'Package 3',
    'description',
    :'image3ID',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'digest-package3-1.0.0',
    'readme',
    true,
    true,
    '2020-06-16 11:20:34+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package4ID',
    'package4',
    '1.0.0',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    readme,
    deprecated,
    ts
) values (
    :'package4ID',
    '1.0.0',
    'Package 4',
    'description',
    :'image4ID',
    '{"kw1", "kw2"}',
    'home_url',
    'readme',
    false,
    '2019-06-16 11:20:34+02'
);

-- Run some tests
select floor(extract(epoch from ts)) as p1v1_ts
from snapshot
where package_id = :'package1ID' and version = '1.0.0' \gset
select jsonb_set('[
    {
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "package1",
        "normalized_name": "package1",
        "stars": 10,
        "display_name": "Package 1",
        "description": "description",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "version": "1.0.0",
        "deprecated": false,
        "signed": false,
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "repo2",
            "display_name": "Repo 2",
            "url": "https://repo2.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "scanner_disabled": false,
            "organization_name": "org1",
            "organization_display_name": "Organization 1"
        }
    }
]', '{0, ts}', :'p1v1_ts') as expected_random_packages \gset
select is(
    get_random_packages()::jsonb,
    :'expected_random_packages',
    'One random package expected (package1)'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
