-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email, password) values (:'user1ID', 'user1', 'user1@email.com', 'old');
insert into session (session_id, user_id) values (gen_random_bytes(32), :'user1ID');

-- Update user password providing correct old password
select update_user_password(:'user1ID', 'old', 'new');

-- Run some tests
select results_eq(
    $$ select password from "user" $$,
    $$ values ('new') $$,
    'User password should have been updated'
);
select is_empty(
    $$
        select * from session
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User1 sessions should have been deleted after updating the password successfully'
);

-- Seed some data
insert into session (session_id, user_id) values (gen_random_bytes(32), :'user1ID');

-- Try updating user password providing incorrect old password
select update_user_password(:'user1ID', 'incorrect', 'new2');

-- Run some tests
select results_eq(
    $$ select password from "user" $$,
    $$ values ('new') $$,
    'User password should not have been updated'
);
select isnt_empty(
    $$
        select * from session
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User1 sessions should not have been deleted as the password was not updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
