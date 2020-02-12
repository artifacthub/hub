-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- No packages at this point
select is(
    get_packages_updates()::jsonb,
    '{
        "latest_packages_added": [],
        "packages_recently_updated": []
    }'::jsonb,
    'No packages in db yet, no updates expected'
);

-- Seed some packages
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com');
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    image_id,
    keywords,
    latest_version,
    created_at,
    updated_at,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'package1',
    'Package 1',
    'description',
    'home_url',
    :'image1ID',
    '{"kw1", "kw2"}',
    '1.0.0',
    current_timestamp - '1s'::interval,
    current_timestamp - '1s'::interval,
    0,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package1ID',
    '1.0.0',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    image_id,
    keywords,
    latest_version,
    created_at,
    updated_at,
    package_kind_id,
    chart_repository_id
) values (
    :'package2ID',
    'package2',
    'Package 2',
    'description',
    'home_url',
    :'image2ID',
    '{"kw1", "kw2"}',
    '1.0.0',
    current_timestamp - '2s'::interval,
    current_timestamp - '2s'::interval,
    0,
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package2ID',
    '1.0.0',
    '12.1.0',
    'digest-package2-1.0.0',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);

-- Some packages have just been seeded
select is(
    get_packages_updates()::jsonb,
    '{
        "latest_packages_added": [{
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "package1",
            "display_name": "Package 1",
            "image_id": "00000000-0000-0000-0000-000000000001",
            "app_version": "12.1.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                "name": "repo1",
                "display_name": "Repo 1"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "display_name": "Package 2",
            "image_id": "00000000-0000-0000-0000-000000000002",
            "app_version": "12.1.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }],
        "packages_recently_updated": [{
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "package1",
            "display_name": "Package 1",
            "image_id": "00000000-0000-0000-0000-000000000001",
            "app_version": "12.1.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                "name": "repo1",
                "display_name": "Repo 1"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "display_name": "Package 2",
            "image_id": "00000000-0000-0000-0000-000000000002",
            "app_version": "12.1.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }]
    }'::jsonb,
    'latest_packages_added and packages_recently_updated should contain 2 packages each'
);

-- Register a new version of the package previously registered
select register_package('
{
    "kind": 0,
    "name": "package2",
    "display_name": "Package 2 v2",
    "description": "description v2",
    "home_url": "home_url",
    "image_id": "00000000-0000-0000-0000-000000000002",
    "keywords": ["kw1", "kw2"],
    "readme": "readme-version-2.0.0",
    "version": "2.0.0",
    "app_version": "13.0.0",
    "digest": "digest-package2-2.0.0",
    "maintainers": [
        {
            "name": "name1",
            "email": "email1"
        }
    ],
    "chart_repository": {
        "chart_repository_id": "00000000-0000-0000-0000-000000000002"
    }
}
');

-- Check the packages_recently_updated have changed
select is(
    get_packages_updates()::jsonb,
    '{
        "latest_packages_added": [{
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "package1",
            "display_name": "Package 1",
            "image_id": "00000000-0000-0000-0000-000000000001",
            "app_version": "12.1.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                "name": "repo1",
                "display_name": "Repo 1"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "display_name": "Package 2 v2",
            "image_id": "00000000-0000-0000-0000-000000000002",
            "app_version": "13.0.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }],
        "packages_recently_updated": [{
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "display_name": "Package 2 v2",
            "image_id": "00000000-0000-0000-0000-000000000002",
            "app_version": "13.0.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "package1",
            "display_name": "Package 1",
            "image_id": "00000000-0000-0000-0000-000000000001",
            "app_version": "12.1.0",
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                "name": "repo1",
                "display_name": "Repo 1"
            }
        }]
    }'::jsonb,
    'packages_recently_updated should have changed: package2 is now first and version has changed'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
