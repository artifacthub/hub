-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'

-- Seed user and two chart repositories
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com');

-- Try deleting a repo without providing the user id owning the repo
select delete_chart_repository('
    {
        "name": "repo1"
    }
'::jsonb);
select isnt_empty(
    $$ select name from chart_repository where name='repo1' $$,
    'Should not be deleted if a user id is not provided'
);

-- Try deleting a repo providing a user id who does not own the repo
select delete_chart_repository('
    {
        "name": "repo1",
        "user_id": "00000000-0000-0000-0000-000000000002"
    }
'::jsonb);
select isnt_empty(
    $$ select name from chart_repository where name='repo1' $$,
    'Should not be deleted if a user id who does not own the repo is not provided'
);

-- Try deleting a repo providing the user id who owns the repo
select delete_chart_repository('
    {
        "name": "repo1",
        "user_id": "00000000-0000-0000-0000-000000000001"
    }
'::jsonb);
select is_empty(
    $$ select name from chart_repository where name='repo1' $$,
    'Should be deleted when the owner user id is provided'
);

-- Try deleting a repo not owned by any user without providing the user id
select delete_chart_repository('
    {
        "name": "repo2"
    }
'::jsonb);
select isnt_empty(
    $$ select name from chart_repository where name='repo2' $$,
    'Should not be deleted if a user id is not provided'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
