-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed user
insert into "user" (user_id, alias, email, password) values (:'user1ID', 'user1', 'user1@email.com', 'old');

-- Update user password providing correct old password
select update_user_password(:'user1ID', 'old', 'new');

-- Run some tests
select results_eq(
    $$ select password from "user" $$,
    $$ values ('new') $$,
    'User password should have been updated'
);

-- Try updating user password providing incorrect old password
select update_user_password(:'user1ID', 'incorrect', 'new2');

-- Run some tests
select results_eq(
    $$ select password from "user" $$,
    $$ values ('new') $$,
    'User password should not have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
