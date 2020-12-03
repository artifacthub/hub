-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'

-- Non existing repository
select is_empty(
    $$ select get_repository_by_name('repo1', false) $$,
    'If repository requested does not exist no rows are returned'
);

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');

-- One repository has just been seeded
select is(
    get_repository_by_name('repo1', false)::jsonb,
    '{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "disabled": false,
        "scanner_disabled": false,
        "user_alias": "user1"
    }'::jsonb,
    'Repository just seeded is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
