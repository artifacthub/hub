-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed user
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');

-- Register delete user code
select register_delete_user_code(:'user1ID', 'code1');
select is(
    delete_user_code_id,
    'code1',
    'Delete user code for user1 should be registered'
)
from delete_user_code where user_id = :'user1ID';

-- Register another user delete code for the same user
select register_delete_user_code(:'user1ID', 'code2');
select is(
    delete_user_code_id,
    'code2',
    'Delete user code for user1 should have been updated'
)
from delete_user_code where user_id = :'user1ID';

-- Try registering user delete code using inexistent user
select throws_ok(
    $$ select register_delete_user_code('00000000-0000-0000-0000-000000000002', 'code') $$,
    '23503',
    'insert or update on table "delete_user_code" violates foreign key constraint "delete_user_code_user_id_fkey"',
    'No delete user code should be registered for inexistent user'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
