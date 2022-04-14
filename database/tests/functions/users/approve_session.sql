-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set session1ID '00001'
\set session2ID '00002'

-- Seed some data
insert into "user" (user_id, alias, email, tfa_recovery_codes)
values (:'user1ID', 'user1', 'user1@email.com', '{code1, code2}');
insert into session (session_id, user_id, approved) values (:'session1ID', :'user1ID', false);
insert into session (session_id, user_id, approved) values (:'session2ID', :'user1ID', false);

-- Run some tests
select approve_session(:'session1ID', '');
select is(
    true,
    approved,
    'session1 should be approved'
)
from session where session_id = :'session1ID';
select approve_session(:'session2ID', 'code1');
select is(
    true,
    approved,
    'session2 should be approved'
)
from session where session_id = :'session2ID';
select is(
    '{code2}',
    tfa_recovery_codes,
    'code1 should have been removed from 2fa recovery codes list'
)
from "user" where user_id = (select user_id from session where session_id = :'session2ID');

-- Finish tests and rollback transaction
select * from finish();
rollback;
