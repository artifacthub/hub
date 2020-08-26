-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set optOut1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut1ID', :'user1ID', :'repo1ID', 2);

-- Delete opt-out entry
select delete_opt_out(:'user1ID', :'optOut1ID');

-- Check if opt-out entry was deleted successfully
select is_empty(
    $$
        select *
        from opt_out
        where user_id = '00000000-0000-0000-0000-000000000001'
        and repository_id = '00000000-0000-0000-0000-000000000001'
        and event_kind_id = 2
    $$,
    'Opt-out entry should not exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
