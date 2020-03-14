-- Start transaction and plan tests
begin;
select plan(9);

-- Declare some variables
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set maintainer1ID '00000000-0000-0000-0000-000000000001'
\set maintainer2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'

-- Some invalid queries
select throws_ok(
    $$
        select get_package('{
            "package_name": "package1",
            "chart_repository_name": "repo1"
        }')
    $$,
    'a valid package kind must be provided',
    'Package kind must be provided'
);
select throws_ok(
    $$
        select get_package('{
            "kind": 99,
            "package_name": "package1",
            "chart_repository_name": "repo1"
        }')
    $$,
    'a valid package kind must be provided',
    'A valid package kind must be provided'
);
select throws_ok(
    $$
        select get_package('{
            "kind": 0,
            "package_name": "package1"
        }')
    $$,
    'a valid chart repository name must be provided',
    'Chart repository name must be provided if kind is chart'
);
select throws_ok(
    $$
        select get_package('{
            "kind": 0,
            "package_name": "package1",
            "chart_repository_name": ""
        }')
    $$,
    'a valid chart repository name must be provided',
    'A valid chart repository name must be provided if kind is chart'
);
select throws_ok(
    $$
        select get_package('{
            "kind": 0,
            "chart_repository_name": "repo1"
        }')
    $$,
    'a valid package name must be provided',
    'Package name must be provided if kind is chart'
);
select throws_ok(
    $$
        select get_package('{
            "kind": 0,
            "package_name": "",
            "chart_repository_name": "repo1"
        }')
    $$,
    'a valid package name must be provided',
    'A valid package name must be provided if kind is chart'
);

-- No packages at this point
select is_empty(
    $$
        select get_package('{
            "kind": 0,
            "package_name": "package1",
            "chart_repository_name": "repo1"
        }')
    $$,
    'If package requested does not exist no rows are returned'
);

-- Seed package with 2 versions
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer1ID', 'name1', 'email1');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer2ID', 'name2', 'email2');
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
    true,
    '1.0.0',
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
    app_version,
    digest,
    readme,
    links
) values (
    :'package1ID',
    '1.0.0',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme-version-1.0.0',
    '{"link1": "https://link1", "link2": "https://link2"}'
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
    '0.0.9',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme-version-0.0.9',
    '{"link1": "https://link1", "link2": "https://link2"}'
);

-- Package has just been seeded
select is(
    get_package('{
        "kind": 0,
        "package_name": "package1",
        "chart_repository_name": "repo1"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "package1",
        "display_name": "Package 1",
        "description": "description",
        "home_url": "home_url",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "keywords": ["kw1", "kw2"],
        "deprecated": true,
        "readme": "readme-version-1.0.0",
        "links": {
            "link1": "https://link1",
            "link2": "https://link2"
        },
        "version": "1.0.0",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
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
        "chart_repository": {
            "chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }'::jsonb,
    'Last package version is returned as a json object'
);
select is(
    get_package('{
        "kind": 0,
        "package_name": "package1",
        "chart_repository_name": "repo1",
        "version": "0.0.9"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "package1",
        "display_name": "Package 1",
        "description": "description",
        "home_url": "home_url",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "keywords": ["kw1", "kw2"],
        "deprecated": true,
        "readme": "readme-version-0.0.9",
        "links": {
            "link1": "https://link1",
            "link2": "https://link2"
        },
        "version": "0.0.9",
        "available_versions": ["0.0.9", "1.0.0"],
        "app_version": "12.0.0",
        "digest": "digest-package1-0.0.9",
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
        "chart_repository": {
            "chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com"
        }
    }'::jsonb,
    'Requested package version is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
