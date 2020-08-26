-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');

-- Add opt-out entry
select add_opt_out('
{
    "user_id": "00000000-0000-0000-0000-000000000001",
    "repository_id": "00000000-0000-0000-0000-000000000001",
    "event_kind": 2
}
'::jsonb);

-- Check if opt-out entry was added successfully
select results_eq(
    $$
        select
            user_id,
            repository_id,
            event_kind_id
        from opt_out
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            2
        )
    $$,
    'Opt-out entry should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
