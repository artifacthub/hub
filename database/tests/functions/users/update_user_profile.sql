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
    password,
    profile_image_id
) values (
    :'user1ID',
    'user1',
    'firstname',
    'lastname',
    'user1@email.com',
    'password',
    '00000000-0000-0000-0000-000000000001'
);

-- Update user profile
select update_user_profile(:'user1ID', '
{
    "alias": "user1 updated",
    "first_name": "firstname updated",
    "last_name": "lastname updated",
    "profile_image_id": "00000000-0000-0000-0000-000000000002"
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
            password,
            profile_image_id
        from "user"
    $$,
    $$
        values (
            'user1 updated',
            'firstname updated',
            'lastname updated',
            'user1@email.com',
            'password',
            '00000000-0000-0000-0000-000000000002'::uuid
        )
    $$,
    'User first and last name should have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
