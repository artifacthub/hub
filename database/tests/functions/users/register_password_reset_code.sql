-- Start transaction and plan tests
begin;
select plan(5);

-- Seed user
insert into "user" (user_id, alias, email, email_verified)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com', true);
insert into "user" (user_id, alias, email, email_verified)
values ('00000000-0000-0000-0000-000000000002', 'user2', 'user2@email.com', false);

-- Register password reset code
select register_password_reset_code('user1@email.com') as code1 \gset
select is(
    password_reset_code_id,
    sha512(:'code1'),
    'Password reset code for user1 should be registered'
)
from password_reset_code
join "user" using (user_id)
where alias = 'user1';

-- Register another password reset code for the same user
select register_password_reset_code('user1@email.com') as code2 \gset
select is(
    password_reset_code_id,
    sha512(:'code2'),
    'Password reset code for user1 should have been updated'
)
from password_reset_code
join "user" using (user_id)
where alias = 'user1';
select isnt(
    :'code1'::bytea,
    :'code2'::bytea,
    'Password reset code must have changed'
);

-- Try registering password reset code using non verified email
select throws_ok(
    $$ select register_password_reset_code('user2@email.com') $$,
    'P0001',
    'invalid email',
    'No password reset code should be registered for non verified email user2@email.com'
);

-- Try registering password reset code using unregistered email
select throws_ok(
    $$ select register_password_reset_code('user3@email.com') $$,
    'P0001',
    'invalid email',
    'No password reset code should be registered for unregistered email user3@email.com'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
