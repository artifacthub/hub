-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'
\set repo4ID '00000000-0000-0000-0000-000000000004'
\set repo5ID '00000000-0000-0000-0000-000000000005'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set package4ID '00000000-0000-0000-0000-000000000004'
\set package5ID '00000000-0000-0000-0000-000000000005'
\set package6ID '00000000-0000-0000-0000-000000000006'
\set package7ID '00000000-0000-0000-0000-000000000007'

-- No snapshots at this point
select is(
    get_snapshots_to_scan()::jsonb,
    '[]'::jsonb,
    'No snapshots to scan expected'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, scanner_disabled, repository_kind_id, organization_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', true, 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo4ID', 'repo4', 'Repo 4', 'https://repo4.com', 13, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo5ID', 'repo5', 'Repo 5', 'https://repo5.com', 22, :'org1ID');
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
    version,
    containers_images,
    created_at
) values (
    :'package1ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg1:1.0.0"}]',
    '2020-06-16 11:20:38+02'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    created_at
) values (
    :'package1ID',
    '0.0.9',
    '[{"image": "quay.io/org/pkg1:0.0.9"}]',
    '2020-06-16 11:20:37+02'
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
    containers_images,
    created_at
) values (
    :'package2ID',
    '1.0.0',
    '[
        {"image": "quay.io/org/pkg2:1.0.0", "whitelisted": false},
        {"image": "quay.io/org/pkg2helper1:1.0.0", "whitelisted": true}
    ]',
    '2020-06-16 11:20:36+02'
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
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    security_report,
    security_report_created_at,
    created_at
) values (
    :'package3ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg3:1.0.0"}]',
    '{"k": "v"}',
    current_timestamp - '2 days'::interval,
    '2020-06-16 11:20:35+02'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    security_report,
    security_report_created_at,
    created_at
) values (
    :'package3ID',
    '0.0.9',
    '[{"image": "quay.io/org/pkg3:0.0.9"}]',
    '{"k": "v"}',
    current_timestamp - '2 days'::interval,
    '2020-06-16 11:20:34+02'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    security_report,
    security_report_created_at,
    created_at
) values (
    :'package3ID',
    '0.0.8',
    '[{"image": "quay.io/org/pkg3:0.0.8"}]',
    '{"k": "v"}',
    current_timestamp - '2 weeks'::interval,
    '2020-06-16 11:20:33+02'
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
    :'repo3ID'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    created_at
) values (
    :'package4ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg4:1.0.0"}]',
    '2020-06-16 11:20:32+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package5ID',
    'package5',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    ts,
    created_at
) values (
    :'package5ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg5:1.0.0"}]',
    '2010-06-16 11:20:31+02',
    '2010-06-16 11:20:31+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package6ID',
    'package6',
    '1.0.0',
    :'repo4ID'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package7ID',
    'package7',
    '1.0.0',
    :'repo5ID'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    ts,
    created_at
) values (
    :'package6ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg6:1.0.0"}]',
    current_timestamp - '2 weeks'::interval,
    '2010-06-16 11:20:30+02'
);
insert into snapshot (
    package_id,
    version,
    containers_images,
    ts,
    created_at
) values (
    :'package7ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg6:1.0.0"}]',
    current_timestamp - '2 weeks'::interval,
    '2010-06-16 11:20:30+02'
);

-- Run some tests
select is(
    get_snapshots_to_scan()::jsonb,
    '[
        {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "package_id": "00000000-0000-0000-0000-000000000001",
            "package_name": "package1",
            "version": "1.0.0",
            "containers_images": [
                {
                    "image": "quay.io/org/pkg1:1.0.0"
                }
            ]
        },
        {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "package_id": "00000000-0000-0000-0000-000000000001",
            "package_name": "package1",
            "version": "0.0.9",
            "containers_images": [
                {
                    "image": "quay.io/org/pkg1:0.0.9"
                }
            ]
        },
        {
            "repository_id": "00000000-0000-0000-0000-000000000002",
            "package_id": "00000000-0000-0000-0000-000000000002",
            "package_name": "package2",
            "version": "1.0.0",
            "containers_images": [
                {
                    "image": "quay.io/org/pkg2:1.0.0",
                    "whitelisted": false
                }
            ]
        },
        {
            "repository_id": "00000000-0000-0000-0000-000000000002",
            "package_id": "00000000-0000-0000-0000-000000000003",
            "package_name": "package3",
            "version": "1.0.0",
            "containers_images": [
                {
                    "image": "quay.io/org/pkg3:1.0.0"
                }
            ]
        },
        {
            "repository_id": "00000000-0000-0000-0000-000000000002",
            "package_id": "00000000-0000-0000-0000-000000000003",
            "package_name": "package3",
            "version": "0.0.8",
            "containers_images": [
                {
                    "image": "quay.io/org/pkg3:0.0.8"
                }
            ]
        }
    ]'::jsonb,
    'Some snapshots to scan were expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
