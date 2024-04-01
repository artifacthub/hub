-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set maintainer1ID '00000000-0000-0000-0000-000000000001'

-- No packages at this point
select is(
    get_nova_dump()::jsonb,
    '[]'::jsonb,
    'No packages in db yet, empty dump expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, verified_publisher, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', true, 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', 1, :'org1ID');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer1ID', 'name1', 'email1');
insert into package (
    package_id,
    name,
    latest_version,
    official,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    true,
    :'repo1ID'
);
insert into package__maintainer (package_id, maintainer_id)
values (:'package1ID', :'maintainer1ID');
insert into snapshot (
    package_id,
    version,
    app_version,
    description,
    home_url,
    data,
    links,
    logo_url
) values (
    :'package1ID',
    '1.0.0',
    '1.0.0',
    'description',
    'https://home.url',
    '{"kubeVersion": ">= 1.19.0-0"}',
    '[{"name": "link1", "url": "https://link1"}, {"name": "link2", "url": "https://link2"}]',
    'https://logo.url'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    data,
    deprecated
) values (
    :'package2ID',
    '1.0.0',
    '{"kubeVersion": ""}',
    true
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
    version
) values (
    :'package3ID',
    '1.0.0'
);

-- Run some tests
select is(
    get_nova_dump()::jsonb,
    '[
        {
            "name": "package1",
            "description": "description",
            "home": "https://home.url",
            "latest_version": "1.0.0",
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
            "logo": "https://logo.url",
            "maintainers": [
                {
                    "name": "name1"
                }
            ],
            "official": true,
            "repository": {
                "name": "repo1",
                "url": "https://repo1.com",
                "verified": true
            },
            "versions": [
                {
                    "pkg": "1.0.0",
                    "app": "1.0.0",
                    "kube": ">= 1.19.0-0"
                }
            ]
        },
        {
            "name": "package2",
            "latest_version": "1.0.0",
            "repository": {
                "name": "repo2",
                "url": "https://repo2.com"
            },
            "versions": [
                {
                    "pkg": "1.0.0",
                    "deprecated": true
                }
            ]
        }
    ]'::jsonb,
    'Two packages expected in dump'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
