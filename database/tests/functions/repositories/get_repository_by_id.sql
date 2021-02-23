-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'

-- Non existing repository
select is_empty(
    $$ select get_repository_by_id('00000000-0000-0000-0000-000000000001', false) $$,
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
    auth_user,
    auth_pass,
    digest,
    repository_kind_id,
    user_id,
    last_scanning_ts,
    last_scanning_errors,
    last_tracking_ts,
    last_tracking_errors
)
values (
    :'repo1ID',
    'repo1',
    'Repo 1',
    'https://repo1.com',
    'main',
    'user1',
    'pass1',
    'digest',
    0,
    :'user1ID',
    '2020-06-16 11:20:34+02',
    'error1\nerror2\n',
    '2020-06-16 11:20:34+02',
    'error1\nerror2\n'
);

-- One repository has just been seeded
select is(
    get_repository_by_id('00000000-0000-0000-0000-000000000001', false)::jsonb,
    '{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "branch": "main",
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "disabled": false,
        "scanner_disabled": false,
        "digest": "digest",
        "last_scanning_ts": 1592299234,
        "last_scanning_errors": "error1\\nerror2\\n",
        "last_tracking_ts": 1592299234,
        "last_tracking_errors": "error1\\nerror2\\n",
        "user_alias": "user1"
    }'::jsonb,
    'Repository just seeded is returned as a json object'
);
select is(
    get_repository_by_id('00000000-0000-0000-0000-000000000001', true)::jsonb,
    '{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "branch": "main",
        "auth_user": "user1",
        "auth_pass": "pass1",
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "disabled": false,
        "scanner_disabled": false,
        "digest": "digest",
        "last_scanning_ts": 1592299234,
        "last_scanning_errors": "error1\\nerror2\\n",
        "last_tracking_ts": 1592299234,
        "last_tracking_errors": "error1\\nerror2\\n",
        "user_alias": "user1"
    }'::jsonb,
    'Repository just seeded is returned as a json object which includes the credentials'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
