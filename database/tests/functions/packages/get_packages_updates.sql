-- Start transaction and plan tests
begin;
select plan(3);

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
    get_packages_updates()::jsonb,
    '{
        "latest_packages_added": [],
        "packages_recently_updated": []
    }'::jsonb,
    'No packages in db yet, no updates expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com');
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    logo_image_id,
    keywords,
    deprecated,
    latest_version,
    created_at,
    updated_at,
    package_kind_id,
    organization_id
) values (
    :'package1ID',
    'package1',
    'Package 1',
    'description',
    'home_url',
    :'image1ID',
    '{"kw1", "kw2"}',
    false,
    '1.0.0',
    current_timestamp - '1s'::interval,
    current_timestamp - '1s'::interval,
    1,
    :'org1ID'
);
insert into snapshot (
    package_id,
    version,
    readme,
    links
) values (
    :'package1ID',
    '1.0.0',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    logo_image_id,
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
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    logo_image_id,
    keywords,
    deprecated,
    latest_version,
    created_at,
    updated_at,
    package_kind_id,
    chart_repository_id
) values (
    :'package3ID',
    'package3',
    'Package 3',
    'description',
    'home_url',
    :'image3ID',
    '{"kw1", "kw2"}',
    true,
    '1.0.0',
    current_timestamp - '3s'::interval,
    current_timestamp - '3s'::interval,
    0,
    :'repo3ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package3ID',
    '1.0.0',
    '12.1.0',
    'digest-package3-1.0.0',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);

-- Some packages have just been seeded
select is(
    get_packages_updates()::jsonb,
    '{
        "latest_packages_added": [{
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 1,
            "name": "package1",
            "normalized_name": "package1",
            "display_name": "Package 1",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "version": "1.0.0",
            "app_version": null,
            "organization_name": "org1",
            "organization_display_name": "Organization 1",
            "chart_repository": null
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "normalized_name": "package2",
            "display_name": "Package 2",
            "logo_image_id": "00000000-0000-0000-0000-000000000002",
            "version": "1.0.0",
            "app_version": "12.1.0",
            "organization_name": null,
            "organization_display_name": null,
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }],
        "packages_recently_updated": [{
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 1,
            "name": "package1",
            "normalized_name": "package1",
            "display_name": "Package 1",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "version": "1.0.0",
            "app_version": null,
            "organization_name": "org1",
            "organization_display_name": "Organization 1",
            "chart_repository": null
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "normalized_name": "package2",
            "display_name": "Package 2",
            "logo_image_id": "00000000-0000-0000-0000-000000000002",
            "version": "1.0.0",
            "app_version": "12.1.0",
            "organization_name": null,
            "organization_display_name": null,
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
    "logo_image_id": "00000000-0000-0000-0000-000000000002",
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
    "organization_name": null,
    "organization_display_name": null,
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
            "kind": 1,
            "name": "package1",
            "normalized_name": "package1",
            "display_name": "Package 1",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "version": "1.0.0",
            "app_version": null,
            "organization_name": "org1",
            "organization_display_name": "Organization 1",
            "chart_repository": null
        }, {
            "package_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "package2",
            "normalized_name": "package2",
            "display_name": "Package 2 v2",
            "logo_image_id": "00000000-0000-0000-0000-000000000002",
            "version": "2.0.0",
            "app_version": "13.0.0",
            "organization_name": null,
            "organization_display_name": null,
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
            "normalized_name": "package2",
            "display_name": "Package 2 v2",
            "logo_image_id": "00000000-0000-0000-0000-000000000002",
            "version": "2.0.0",
            "app_version": "13.0.0",
            "organization_name": null,
            "organization_display_name": null,
            "chart_repository": {
                "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                "name": "repo2",
                "display_name": "Repo 2"
            }
        }, {
            "package_id": "00000000-0000-0000-0000-000000000001",
            "kind": 1,
            "name": "package1",
            "normalized_name": "package1",
            "display_name": "Package 1",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "version": "1.0.0",
            "app_version": null,
            "organization_name": "org1",
            "organization_display_name": "Organization 1",
            "chart_repository": null
        }]
    }'::jsonb,
    'packages_recently_updated should have changed: package2 is now first and version has changed'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
