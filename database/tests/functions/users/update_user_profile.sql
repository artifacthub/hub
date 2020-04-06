-- Start transaction and plan tests
begin;
select plan(1);

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

-- Update user profile
select update_user_profile(:'user1ID', '
{
    "first_name": "firstname updated",
    "last_name": "lastname updated"
}
'::jsonb);

-- Run some tests
select results_eq(
    $$
        select
            alias,
            first_name,
            last_name,
            email,
            password
        from "user"
    $$,
    $$
        values (
            'user1',
            'firstname updated',
            'lastname updated',
            'user1@email.com',
            'password'
        )
    $$,
    'User first and last name should have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
