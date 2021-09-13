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

-- No packages at this point
select is(
    get_helm_exporter_dump()::jsonb,
    '[]'::jsonb,
    'No packages in db yet, empty dump expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', 1, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package1ID',
    '1.0.0'
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
    version
) values (
    :'package2ID',
    '1.0.0'
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
    get_helm_exporter_dump()::jsonb,
    '[
        {
            "name": "package1",
            "version": "1.0.0",
            "repository": {
                "name": "repo1",
                "url": "https://repo1.com"
            }
        },
        {
            "name": "package2",
            "version": "1.0.0",
            "repository": {
                "name": "repo2",
                "url": "https://repo2.com"
            }
        }
    ]'::jsonb,
    'Two packages expected in dump'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
