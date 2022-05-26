-- Start transaction and plan tests
begin;
select plan(3);

-- Seed user
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com');

-- Register password reset code
select register_password_reset_code('user1@email.com', 'code1');
select is(
    password_reset_code_id,
    'code1',
    'Password reset code for user1 should be registered'
)
from password_reset_code
join "user" using (user_id)
where alias = 'user1';

-- Register another password reset code for the same user
select register_password_reset_code('user1@email.com', 'code2');
select is(
    password_reset_code_id,
    'code2',
    'Password reset code for user1 should have been updated'
)
from password_reset_code
join "user" using (user_id)
where alias = 'user1';

-- Try registering password reset code using unregistered email
select throws_ok(
    $$ select register_password_reset_code('user2@email.com', 'code') $$,
    'P0001',
    'invalid email',
    'No password reset code should be registered for unregistered email user2@email.com'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
