-- Start transaction and plan tests
begin;
select plan(6);

-- Register user
select register_user('
{
    "alias": "alias",
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email",
    "email_verified": false,
    "password": "password"
}
') as code \gset

-- User has been registered
select results_eq(
    $$ select email_verified from "user" where alias = 'alias' $$,
    $$ values (false) $$,
    'User email should not be verified'
);

-- Verify email
select is(
    verify_email(:'code'),
    true,
    'Email should be verified successfully'
);
select results_eq(
    $$ select email_verified from "user" where alias = 'alias' $$,
    $$ values (true) $$,
    'User email should be verified'
);
select is_empty(
    $$ select * from email_verification_code $$,
    'Email verification should have been deleted'
);
select is(
    verify_email(:'code'),
    false,
    'Trying to verify the same email again should not succeed'
);

-- Register another user
select register_user('
{
    "alias": "alias2",
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email2",
    "email_verified": false,
    "password": "password"
}
') as code2 \gset

-- Set email verification code created_at timestamp to two days ago
update email_verification_code
set created_at = created_at - '2 days'::interval
where email_verification_code_id = :'code2';

-- Verify new user's email
select is(
    verify_email(:'code2'),
    false,
    'Email verification should not succeed as code is expired'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
