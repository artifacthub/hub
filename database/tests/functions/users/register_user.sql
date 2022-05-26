-- Start transaction and plan tests
begin;
select plan(5);

-- Register user
select register_user('
{
    "alias": "alias",
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email",
    "email_verified": false,
    "password": "password",
    "profile_image_id": "00000000-0000-0000-0000-000000000001"
}
') as code \gset

-- Check if user registration succeeded
select results_eq(
    $$
        select
            alias,
            first_name,
            last_name,
            email,
            email_verified,
            password,
            profile_image_id
        from "user"
        where alias = 'alias'
    $$,
    $$
        values (
            'alias',
            'first_name',
            'last_name',
            'email',
            false,
            'password',
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'User should exist'
);
select is(
    email_verification_code_id,
    :'code',
    'Returned email verification code returned should be registered'
)
from email_verification_code
join "user" using (user_id)
where alias = 'alias';

-- Try registering user using the same email
select throws_ok(
    $$
        select register_user('
        {
            "alias": "alias2",
            "first_name": "first_name",
            "last_name": "last_name",
            "email": "email",
            "email_verified": false,
            "password": "password",
            "profile_image_id": "00000000-0000-0000-0000-000000000001"
        }
        ')
    $$,
    23505,
    'duplicate key value violates unique constraint "user_email_key"',
    'Registering the same user again should fail'
);

-- Register new user (email already verified, oauth registration)
select register_user('
{
    "alias": "alias3",
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email3",
    "email_verified": true,
    "profile_image_id": "00000000-0000-0000-0000-000000000001"
}
');

-- Check if user registration succeeded
select results_eq(
    $$
        select
            alias,
            first_name,
            last_name,
            email,
            email_verified,
            password,
            profile_image_id
        from "user"
        where alias = 'alias3'
    $$,
    $$
        values (
            'alias3',
            'first_name',
            'last_name',
            'email3',
            true,
            null,
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'User3 should exist'
);
select is_empty(
    $$
        select *
        from email_verification_code
        join "user" using (user_id)
        where alias = 'alias3'
    $$,
    'No email verification code should be registered for user alias3'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
