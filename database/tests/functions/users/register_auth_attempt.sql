-- Start transaction and plan tests
begin;
select plan(11);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');

-- First attempt should be allowed
select is(
    register_auth_attempt(:'user1ID', 'login_password', 10, 3600),
    0,
    'First attempt should be allowed'
);
select is(
    tat,
    current_timestamp + '1 hour'::interval,
    'First attempt should set tat to now + 1 hour'
)
from auth_attempt_limit where user_id = :'user1ID' and kind = 'login_password';

-- Attempts up to the burst should be allowed
select is(
    array(
        select register_auth_attempt(:'user1ID', 'login_password', 10, 3600)
        from generate_series(2, 10)
    ),
    array_fill(0, array[9]),
    'Attempts 2 to 10 should be allowed'
);

-- Attempt above the burst should be rejected
select is(
    register_auth_attempt(:'user1ID', 'login_password', 10, 3600),
    3600,
    'Attempt 11 should be rejected with 3600 seconds to wait'
);
select is(
    tat,
    current_timestamp + '10 hours'::interval,
    'Rejected attempt should not change tat'
)
from auth_attempt_limit where user_id = :'user1ID' and kind = 'login_password';

-- Kinds and users should be independent
select is(
    register_auth_attempt(:'user1ID', 'login_tfa', 10, 10800),
    0,
    'Attempt of another kind should be allowed'
);
select is(
    register_auth_attempt(:'user2ID', 'login_password', 10, 3600),
    0,
    'Attempt of another user should be allowed'
);

-- Attempt with a tat in the past should be allowed
update auth_attempt_limit set tat = current_timestamp - '1 day'::interval
where user_id = :'user1ID' and kind = 'login_password';
select is(
    register_auth_attempt(:'user1ID', 'login_password', 10, 3600),
    0,
    'Attempt with a tat in the past should be allowed'
);
select is(
    tat,
    current_timestamp + '1 hour'::interval,
    'Attempt with a tat in the past should set tat to now + 1 hour'
)
from auth_attempt_limit where user_id = :'user1ID' and kind = 'login_password';

-- Attempt of an unknown kind should fail
select throws_ok(
    $$ select register_auth_attempt('00000000-0000-0000-0000-000000000001', 'unknown', 10, 3600) $$,
    23514,
    'new row for relation "auth_attempt_limit" violates check constraint "auth_attempt_limit_kind_check"',
    'Attempt of an unknown kind should fail'
);

-- Deleting the user should delete its attempts
delete from "user" where user_id = :'user2ID';
select is_empty(
    $$
        select * from auth_attempt_limit
        where user_id = '00000000-0000-0000-0000-000000000002'
    $$,
    'User2 attempts should have been deleted with the user'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
