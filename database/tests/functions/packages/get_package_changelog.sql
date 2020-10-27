-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
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
    created_at,
    changes
) values (
    :'package1ID',
    '1.0.0',
    '2020-06-16 11:20:34+02',
    '{"feature 3", "fix 3"}'
);
insert into snapshot (
    package_id,
    version,
    created_at,
    changes
) values (
    :'package1ID',
    '0.0.9',
    '2020-06-16 11:20:33+02',
    '{"feature 2", "fix 2"}'
);
insert into snapshot (
    package_id,
    version,
    created_at,
    changes
) values (
    :'package1ID',
    '0.0.8',
    '2020-06-16 11:20:32+02',
    '{"feature 1", "fix 1"}'
);

-- Run some tests
select is(
    get_package_changelog('00000000-0000-0000-0000-000000000001')::jsonb,
    '[
        {
            "version": "1.0.0",
            "created_at": 1592299234,
            "changes": ["feature 3", "fix 3"]
        },
        {
            "version": "0.0.9",
            "created_at": 1592299233,
            "changes": ["feature 2", "fix 2"]
        },
        {
            "version": "0.0.8",
            "created_at": 1592299232,
            "changes": ["feature 1", "fix 1"]
        }
    ]'::jsonb,
    'Package changelog should be returned'
);
select is(
    get_package_changelog('00000000-0000-0000-0000-000000000002')::jsonb,
    '[]'::jsonb,
    'Empty changelog should be returned for inexistent package'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
