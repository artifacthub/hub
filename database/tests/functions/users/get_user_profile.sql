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
    password
) values (
    :'user1ID',
    'user1',
    'firstname',
    'lastname',
    'user1@email.com',
    'password'
);

-- Run some tests
select is(
    get_user_profile(:'user1ID')::jsonb, '
    {
        "alias": "user1",
        "first_name": "firstname",
        "last_name": "lastname",
        "email": "user1@email.com"
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
