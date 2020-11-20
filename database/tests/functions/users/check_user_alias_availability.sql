-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set code2ID '00000000-0000-0000-0000-000000000002'
\set user3ID '00000000-0000-0000-0000-000000000003'
\set code3ID '00000000-0000-0000-0000-000000000003'

-- Seed some data
insert into "user" (
    user_id,
    alias,
    email
) values (
    :'user1ID',
    'user1',
    'user1@email.com'
);
insert into "user" (
    user_id,
    alias,
    email
) values (
    :'user2ID',
    'user2',
    'user2@email.com'
);
insert into email_verification_code (
    email_verification_code_id,
    user_id,
    created_at
) values (
    :'code2ID',
    :'user2ID',
    current_timestamp - '30 minutes'::interval
);
insert into "user" (
    user_id,
    alias,
    email
) values (
    :'user3ID',
    'user3',
    'user3@email.com'
);
insert into email_verification_code (
    email_verification_code_id,
    user_id,
    created_at
) values (
    :'code3ID',
    :'user3ID',
    current_timestamp - '2 days'::interval
);

-- Run some tests
select isnt_empty(
    $$ select check_user_alias_availability('user1') $$,
    'Alias user1 should not be available (verified)'
);
select isnt_empty(
    $$ select check_user_alias_availability('user2') $$,
    'Alias user2 should not be available (not verified but code not expired yet)'
);
select is_empty(
    $$ select check_user_alias_availability('user3') $$,
    'Alias user3 should be available (not verified and code has expired)'
);
select is_empty(
    $$ select check_user_alias_availability('user4') $$,
    'Alias user4 should be available (it does not exist)'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
