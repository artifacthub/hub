-- Start transaction and plan tests
begin;
select plan(8);

-- Seed users
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000002', 'user2', 'user2@email.com');

-- Register password reset code
select register_password_reset_code('user1@email.com', 'code1');
select results_eq(
    $$
        select password_reset_code_id, created_at
        from password_reset_code
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$ values ('code1', current_timestamp) $$,
    'Password reset code for user1 should be registered'
);

-- Try registering another password reset code for the same user
select throws_ok(
    $$ select register_password_reset_code('user1@email.com', 'code2') $$,
    'P0001',
    'password reset code already registered',
    'Password reset code for user1 should not be replaced while it is recent'
);
update password_reset_code set created_at = current_timestamp - '3 hours'::interval
where password_reset_code_id = 'code1';
select throws_ok(
    $$ select register_password_reset_code('user1@email.com', 'code2') $$,
    'P0001',
    'password reset code already registered',
    'Password reset code for user1 should not be replaced when it is exactly 3 hours old'
);
select is(
    password_reset_code_id,
    'code1',
    'Password reset code for user1 should have been kept'
)
from password_reset_code
join "user" using (user_id)
where alias = 'user1';

-- Register another password reset code for the same user once the code is old
update password_reset_code set created_at = current_timestamp - '3 hours 1 second'::interval
where password_reset_code_id = 'code1';
select lives_ok(
    $$ select register_password_reset_code('user1@email.com', 'code2') $$,
    'Password reset code for user1 should be replaced when it is older than 3 hours'
);
select results_eq(
    $$
        select password_reset_code_id, created_at
        from password_reset_code
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$ values ('code2', current_timestamp) $$,
    'Password reset code for user1 should have been updated'
);

-- Register password reset code for another user
select register_password_reset_code('user2@email.com', 'code3');
select results_eq(
    $$
        select alias, password_reset_code_id
        from password_reset_code
        join "user" using (user_id)
        order by password_reset_code_id collate "C"
    $$,
    $$ values ('user1', 'code2'), ('user2', 'code3') $$,
    'Each user should have their own password reset code'
);

-- Try registering password reset code using unregistered email
select throws_ok(
    $$ select register_password_reset_code('user3@email.com', 'code') $$,
    'P0001',
    'invalid email',
    'No password reset code should be registered for unregistered email user3@email.com'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
