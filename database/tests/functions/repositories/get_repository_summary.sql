-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'

-- Non existing repository
select is_empty(
    $$ select get_repository_summary('00000000-0000-0000-0000-000000000001') $$,
    'If repository requested does not exist no rows are returned'
);

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    branch,
    official,
    cncf,
    repository_kind_id,
    user_id
)
values (
    :'repo1ID',
    'repo1',
    'Repo 1',
    'https://repo1.com',
    'main',
    true,
    true,
    0,
    :'user1ID'
);
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    auth_user,
    auth_pass,
    scanner_disabled,
    repository_kind_id,
    user_id
)
values (
    :'repo2ID',
    'repo2',
    'Repo 2',
    'https://repo2.com',
    'user',
    'pass',
    true,
    0,
    :'user1ID'
);

-- One repository has just been seeded
select is(
    get_repository_summary('00000000-0000-0000-0000-000000000001')::jsonb,
    '{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "branch": "main",
        "private": false,
        "kind": 0,
        "verified_publisher": false,
        "official": true,
        "cncf": true,
        "scanner_disabled": false,
        "user_alias": "user1"
    }'::jsonb,
    'Repository 1 is returned as a json object'
);
select is(
    get_repository_summary('00000000-0000-0000-0000-000000000002')::jsonb,
    '{
        "repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
        "url": "https://repo2.com",
        "private": true,
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "scanner_disabled": true,
        "user_alias": "user1"
    }'::jsonb,
    'Repository 2 is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
