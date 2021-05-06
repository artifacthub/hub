-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set code1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set code2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into password_reset_code (password_reset_code_id, user_id, created_at)
values (:'code1ID', :'user1ID', current_timestamp - '5 minute'::interval);
insert into password_reset_code (password_reset_code_id, user_id, created_at)
values (:'code2ID', :'user2ID', current_timestamp - '30 minute'::interval);

-- Password reset should succeed
select lives_ok(
    $$ select verify_password_reset_code('00000000-0000-0000-0000-000000000001') $$,
    'Verify password reset code succeeded'
);

-- Password reset should fail in the following cases
select throws_ok(
    $$ select verify_password_reset_code('00000000-0000-0000-0000-000000000003') $$,
    'P0001',
    'invalid password reset code',
    'Verify password reset code failed because code did not exist'
);
select throws_ok(
    $$ select verify_password_reset_code('00000000-0000-0000-0000-000000000002') $$,
    'P0001',
    'invalid password reset code',
    'Verify password reset code failed because code has expired'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
