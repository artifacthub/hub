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
    "values",
    "schema"
) values (
    :'package1ID',
    '1.0.0',
    '{"key": "value"}',
    '{"key": "value"}'
);

-- Run some tests
select is(
    get_reference_doc('00000000-0000-0000-0000-000000000001', '1.0.0')::jsonb,
    '{
        "values": {
            "key": "value"
        },
        "schema": {
            "key": "value"
        }
    }'::jsonb,
    'Reference documentation is returned as a json object'
);
select is_empty(
    $$ select get_reference_doc('00000000-0000-0000-0000-000000000002', '2.0.0')::jsonb $$,
    'Reference documentation not found for inexistent package version'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
