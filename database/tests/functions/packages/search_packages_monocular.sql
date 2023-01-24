-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- No packages at this point
select is(
    search_packages_monocular('https://artifacthub.io', 'package1')::jsonb,
    '{"data": []}'::jsonb,
    'TSQueryWeb: package1 | No packages expected'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    tsdoc,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    generate_package_tsdoc('package1', null, null, 'description', '{"kw1", "kw2"}', '{"repo1"}', '{"user1"}'),
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description,
    app_version
) values (
    :'package1ID',
    '1.0.0',
    'description',
    '12.1.0'
);

-- Run some tests
select is(
    search_packages_monocular('https://artifacthub.io', 'package1')::jsonb,
    '{
        "data": [{
            "id": "repo1/package1",
            "artifactHub": {
                "packageUrl": "https://artifacthub.io/packages/helm/repo1/package1"
            },
            "attributes": {
                "description": "description",
                "repo": {
                    "name": "repo1",
                    "url": "https://repo1.com"
                }
            },
            "relationships": {
                "latestChartVersion": {
                    "data": {
                        "version": "1.0.0",
                        "app_version": "12.1.0"
                    }
                }
            }
        }]
    }'::jsonb,
    'TSQueryWeb: package1 | Package1 expected'
);
select is(
    search_packages_monocular('https://artifacthub.io', 'package2')::jsonb,
    '{"data": []}'::jsonb,
    'TSQueryWeb: package2 | No packages expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
