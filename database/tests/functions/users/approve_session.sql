-- Start transaction and plan tests
begin;
select plan(13);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set session1ID '00001'
\set session2ID '00002'
\set session3ID '00003'

-- Seed some data
insert into "user" (user_id, alias, email, tfa_recovery_codes)
values (:'user1ID', 'user1', 'user1@email.com', '{code1, code2}');
insert into "user" (user_id, alias, email, tfa_recovery_codes)
values (:'user2ID', 'user2', 'user2@email.com', '{code1, code3}');
insert into session (session_id, user_id, approved) values (:'session1ID', :'user1ID', false);
insert into session (session_id, user_id, approved) values (:'session2ID', :'user1ID', false);
insert into session (session_id, user_id, approved) values (:'session3ID', :'user1ID', false);

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
select is(
    '{code1, code3}',
    tfa_recovery_codes,
    'Other users 2fa recovery codes should not have been modified'
)
from "user" where user_id = :'user2ID';

-- Try using a recovery code that has already been used
select throws_ok(
    $$ select approve_session('00003', 'code1') $$,
    'P0001',
    'invalid recovery code',
    'A recovery code already used should not approve another session'
);

-- Try using a recovery code of another user
select throws_ok(
    $$ select approve_session('00003', 'code3') $$,
    'P0001',
    'invalid recovery code',
    'A recovery code of another user should not approve the session'
);
select is(
    false,
    approved,
    'session3 should still be pending'
)
from session where session_id = :'session3ID';
select is(
    '{code1, code3}',
    tfa_recovery_codes,
    'The other user recovery codes should not have been modified'
)
from "user" where user_id = :'user2ID';

-- Try approving a session that has already been approved
select throws_ok(
    $$ select approve_session('00001', '') $$,
    'P0001',
    'session not pending',
    'A session already approved should not be approved again'
);
select throws_ok(
    $$ select approve_session('00001', 'code2') $$,
    'P0001',
    'session not pending',
    'A session already approved should not be approved again with a recovery code'
);

-- Try approving a session that does not exist
select throws_ok(
    $$ select approve_session('unknown', '') $$,
    'P0001',
    'session not pending',
    'A session that does not exist should not be approved'
);
select throws_ok(
    $$ select approve_session('unknown', 'code2') $$,
    'P0001',
    'session not pending',
    'A session that does not exist should not be approved with a recovery code'
);
select is(
    '{code2}',
    tfa_recovery_codes,
    'The recovery code provided in failed approvals should not have been removed'
)
from "user" where user_id = :'user1ID';

-- Finish tests and rollback transaction
select * from finish();
rollback;
