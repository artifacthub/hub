-- Start transaction and plan tests
begin;
select plan(5);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set maintainer1ID '00000000-0000-0000-0000-000000000001'
\set maintainer2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- No packages at this point
select is_empty(
    $$
        select get_package('{
            "package_name": "package1",
            "chart_repository_name": "repo1"
        }')
    $$,
    'If package requested does not exist no rows are returned'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer1ID', 'name1', 'email1');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer2ID', 'name2', 'email2');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    :'image1ID',
    0,
    :'repo1ID'
);
insert into package__maintainer (package_id, maintainer_id)
values (:'package1ID', :'maintainer1ID');
insert into package__maintainer (package_id, maintainer_id)
values (:'package1ID', :'maintainer2ID');
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
    links,
    data,
    deprecated
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme-version-1.0.0',
    '[{"name": "link1", "url": "https://link1"}, {"name": "link2", "url": "https://link2"}]',
    '{"key": "value"}',
    true
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
    links,
    data
) values (
    :'package1ID',
    '0.0.9',
    'Package 1 (older)',
    'description (older)',
    '{"kw1", "kw2", "older"}',
    'home_url (older)',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme-version-0.0.9',
    '[{"name": "link1", "url": "https://link1"}, {"name": "link2", "url": "https://link2"}]',
    '{"key": "value"}'
);
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    organization_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'image2ID',
    1,
    :'org1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    readme,
    data
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    '{"kw1", "kw2"}',
    'readme-version-1.0.0',
    '{"key": "value"}'
);

-- Run some tests
select is(
    get_package('{
        "package_id": "00000000-0000-0000-0000-000000000001"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "display_name": "Package 1",
        "description": "description",
        "keywords": ["kw1", "kw2"],
        "home_url": "home_url",
        "readme": "readme-version-1.0.0",
        "links": [
            {
                "name": "link1",
                "url": "https://link1"
            },
            {
                "name": "link2",
                "url": "https://link2"
            }
        ],
        "data": {
            "key": "value"
        },
        "version": "1.0.0",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
        "deprecated": true,
        "maintainers": [
            {
                "name": "name1",
                "email": "email1"
            },
            {
                "name": "name2",
                "email": "email2"
            }
        ],
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null,
        "chart_repository": {
            "chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }'::jsonb,
    'Last package1 version is returned as a json object'
);
select is(
    get_package('{
        "package_name": "package-1",
        "chart_repository_name": "repo1"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "display_name": "Package 1",
        "description": "description",
        "keywords": ["kw1", "kw2"],
        "home_url": "home_url",
        "readme": "readme-version-1.0.0",
        "links": [
            {
                "name": "link1",
                "url": "https://link1"
            },
            {
                "name": "link2",
                "url": "https://link2"
            }
        ],
        "data": {
            "key": "value"
        },
        "version": "1.0.0",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
        "deprecated": true,
        "maintainers": [
            {
                "name": "name1",
                "email": "email1"
            },
            {
                "name": "name2",
                "email": "email2"
            }
        ],
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null,
        "chart_repository": {
            "chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }'::jsonb,
    'Last package1 version is returned as a json object'
);
select is(
    get_package('{
        "package_name": "package-1",
        "chart_repository_name": "repo1",
        "version": "0.0.9"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "display_name": "Package 1 (older)",
        "description": "description (older)",
        "keywords": ["kw1", "kw2", "older"],
        "home_url": "home_url (older)",
        "readme": "readme-version-0.0.9",
        "links": [
            {
                "name": "link1",
                "url": "https://link1"
            },
            {
                "name": "link2",
                "url": "https://link2"
            }
        ],
        "data": {
            "key": "value"
        },
        "version": "0.0.9",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.0.0",
        "digest": "digest-package1-0.0.9",
        "deprecated": null,
        "maintainers": [
            {
                "name": "name1",
                "email": "email1"
            },
            {
                "name": "name2",
                "email": "email2"
            }
        ],
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null,
        "chart_repository": {
            "chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }'::jsonb,
    'Requested package version is returned as a json object'
);
select is(
    get_package('{
        "package_name": "package2"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000002",
        "kind": 1,
        "name": "package2",
        "normalized_name": "package2",
        "logo_image_id": "00000000-0000-0000-0000-000000000002",
        "display_name": "Package 2",
        "description": "description",
        "keywords": ["kw1", "kw2"],
        "home_url": null,
        "readme": "readme-version-1.0.0",
        "links": null,
        "digest": null,
        "data": {
            "key": "value"
        },
        "deprecated": null,
        "version": "1.0.0",
        "app_version": null,
        "available_versions": ["1.0.0"],
        "maintainers": null,
        "user_alias": null,
        "organization_name": "org1",
        "organization_display_name": "Organization 1",
        "chart_repository": null
    }'::jsonb,
    'Last package2 version is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
