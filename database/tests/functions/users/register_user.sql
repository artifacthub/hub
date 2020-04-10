-- Start transaction and plan tests
begin;
select plan(4);

-- Register user
select register_user('
{
    "alias": "alias",
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email",
    "email_verified": true,
    "password": "password"
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
            password
        from "user"
        where alias = 'alias'
    $$,
    $$
        values (
            'alias',
            'first_name',
            'last_name',
            'email',
            true,
            'password'
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
            "email_verified": true,
            "password": "password"
        }
        ')
    $$,
    23505,
    'duplicate key value violates unique constraint "user_email_key"',
    'Registering the same user again should fail'
);

-- Set email verification code created_at timestamp to two days ago
update email_verification_code
set created_at = created_at - '2 days'::interval
where email_verification_code_id = :'code';

-- Try registering user using the same email again
select lives_ok(
    $$
        select register_user('
        {
            "alias": "alias2",
            "first_name": "first_name",
            "last_name": "last_name",
            "email": "email",
            "email_verified": true,
            "password": "password"
        }
        ')
    $$,
    'Registering the same user again should work as the email was not verified on time'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
