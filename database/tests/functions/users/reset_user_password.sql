-- Start transaction and plan tests
begin;
select plan(6);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set code1ID '00000000-0000-0000-0000-000000000001'
\set code2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into password_reset_code (password_reset_code_id, user_id, created_at)
values (:'code1ID', :'user1ID', current_timestamp);
insert into password_reset_code (password_reset_code_id, user_id, created_at)
values (:'code2ID', :'user2ID', current_timestamp - '30 minute'::interval);
insert into session (session_id, user_id) values (gen_random_bytes(32), :'user1ID');

-- Password reset should fail in the following cases
select throws_ok(
    $$ select reset_user_password('00000000-0000-0000-0000-000000000003', 'pass') $$,
    'P0001',
    'invalid password reset code',
    'Password reset failed because code did not exist'
);
select throws_ok(
    $$ select reset_user_password('00000000-0000-0000-0000-000000000002', 'pass') $$,
    'P0001',
    'invalid password reset code',
    'Password reset failed because code has expired'
);

-- Reset password successfully for user1
select reset_user_password(:'code1ID', 'pass') as email1 \gset
select results_eq(
    $$ select password, email_verified from "user" where alias = 'user1' $$,
    $$ values ('pass', true) $$,
    'User password should have been updated and the email marked as verified'
);
select is_empty(
    $$
        select * from password_reset_code
        where password_reset_code_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'Password reset code should have been deleted after resetting password successfully'
);
select is_empty(
    $$
        select * from session
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User1 sessions should have been deleted after resetting password successfully'
);
select is(
    :'email1'::text,
    'user1@email.com'::text,
    'User1 email should be returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
