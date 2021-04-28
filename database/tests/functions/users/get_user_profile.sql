-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed user
insert into "user" (
    user_id,
    alias,
    first_name,
    last_name,
    email,
    password,
    profile_image_id,
    tfa_enabled
) values (
    :'user1ID',
    'user1',
    'firstname',
    'lastname',
    'user1@email.com',
    'password',
    '00000000-0000-0000-0000-000000000001',
    true
);

-- Run some tests
select is(
    get_user_profile(:'user1ID')::jsonb, '
    {
        "alias": "user1",
        "first_name": "firstname",
        "last_name": "lastname",
        "email": "user1@email.com",
        "profile_image_id": "00000000-0000-0000-0000-000000000001",
        "password_set": true,
        "tfa_enabled": true
    }
    '::jsonb,
    'User1 should exist'
);
select is_empty(
    $$ select get_user_profile('00000000-0000-0000-0000-000000000002')::jsonb $$,
    'User2 should not exist'
);


-- Finish tests and rollback transaction
select * from finish();
rollback;
