-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into auth_attempt_limit (user_id, kind, tat)
values (:'user1ID', 'login_password', current_timestamp + '10 hours'::interval);
insert into auth_attempt_limit (user_id, kind, tat)
values (:'user1ID', 'login_tfa', current_timestamp + '30 minutes'::interval);

-- Refund should give back one interval
select refund_auth_attempt(:'user1ID', 'login_password', 3600);
select is(
    tat,
    current_timestamp + '9 hours'::interval,
    'Refund should give back one interval'
)
from auth_attempt_limit where user_id = :'user1ID' and kind = 'login_password';

-- Next attempt should be allowed
select is(
    register_auth_attempt(:'user1ID', 'login_password', 10, 3600),
    0,
    'Attempt after a refund should be allowed'
);

-- Refund should never set tat before now
select refund_auth_attempt(:'user1ID', 'login_tfa', 3600);
select is(
    tat,
    current_timestamp,
    'Refund should never set tat before now'
)
from auth_attempt_limit where user_id = :'user1ID' and kind = 'login_tfa';

-- Refund without attempts should create nothing
select refund_auth_attempt(:'user1ID', 'tfa_disable', 86400);
select is_empty(
    $$
        select * from auth_attempt_limit
        where user_id = '00000000-0000-0000-0000-000000000001'
        and kind = 'tfa_disable'
    $$,
    'Refund without attempts should create nothing'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
