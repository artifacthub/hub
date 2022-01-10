-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email, created_at)
values (:'user1ID', 'user1', 'user1@email.com', '2020-06-16 11:20:34+02');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id, created_at)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID', '2020-06-16 11:20:34+02');
insert into package (
    package_id,
    name,
    latest_version,
    created_at,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    '2020-06-16 11:20:34+02',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    created_at
) values (
    :'package1ID',
    '1.0.0',
    '2020-06-16 11:20:34+02'
);
insert into snapshot (
    package_id,
    version,
    created_at
) values (
    :'package1ID',
    '0.0.9',
    '2020-06-16 11:20:34+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    created_at,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    '2020-06-17 11:20:34+02',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    created_at
) values (
    :'package2ID',
    '1.0.0',
    '2020-06-17 11:20:34+02'
);
insert into snapshot (
    package_id,
    version,
    created_at
) values (
    :'package2ID',
    '0.0.9',
    '2020-06-17 11:20:34+02'
);

-- Some packages have just been seeded
select is(
    get_stats()::jsonb - '{generated_at}'::text[],
    '{
        "packages": {
            "total": 2,
            "running_total": [
                [1592265600000, 1],
                [1592352000000, 2]
            ],
            "created_monthly": [
                [1590969600000, 2]
            ]
        },
        "snapshots": {
            "total": 4,
            "running_total": [
                [1592265600000, 2],
                [1592352000000, 4]
            ],
            "created_monthly": [
                [1590969600000, 4]
            ]
        },
        "repositories": {
            "total": 1,
            "running_total": [
                [1592265600000, 1]
            ]
        },
        "organizations": {
            "total": 0
        },
        "users": {
            "total": 1,
            "running_total": [
                [1592265600000, 1]
            ]
        }
    }'::jsonb,
    'Stats are returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
