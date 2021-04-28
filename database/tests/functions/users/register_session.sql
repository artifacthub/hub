-- Start transaction and plan tests
begin;
select plan(6);

-- Seed user
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email, tfa_enabled)
values ('00000000-0000-0000-0000-000000000002', 'user2', 'user2@email.com', true);

-- Register session for user with tfa disabled
select session_id, approved from register_session('
{
    "user_id": "00000000-0000-0000-0000-000000000001",
    "ip": "192.168.1.100",
    "user_agent": "Safari 13.0.5"
}
') \gset

-- Check if session registration succeeded
select results_eq(
    $$
        select
            user_id,
            ip,
            user_agent,
            approved
        from session
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '192.168.1.100'::inet,
            'Safari 13.0.5',
            true
        )
    $$,
    'Session for user1 should exist'
);
select is(
    session_id,
    sha512(:'session_id'),
    'Returned session id for user1 should match value stored'
)
from session where user_id = '00000000-0000-0000-0000-000000000001';
select is(
    true,
    :'approved',
    'Returned approved value for user1 should be true'
)
from session where user_id = '00000000-0000-0000-0000-000000000001';

-- Register session for user with tfa enabled
select session_id, approved from register_session('
{
    "user_id": "00000000-0000-0000-0000-000000000002"
}
') \gset

-- Check if session registration succeeded
select results_eq(
    $$
        select user_id, approved
        from session
        where user_id = '00000000-0000-0000-0000-000000000002'
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000002'::uuid,
            false
        )
    $$,
    'Session for user2 should exist'
);
select is(
    session_id,
    sha512(:'session_id'),
    'Returned session id for user2 should match value stored'
)
from session where user_id = '00000000-0000-0000-0000-000000000002';
select is(
    false,
    :'approved',
    'Returned approved value for user2 should be false'
)
from session where user_id = '00000000-0000-0000-0000-000000000002';

-- Finish tests and rollback transaction
select * from finish();
rollback;
