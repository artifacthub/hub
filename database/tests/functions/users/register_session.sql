-- Start transaction and plan tests
begin;
select plan(2);

-- Seed user
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com');

-- Register session
select register_session('
{
    "user_id": "00000000-0000-0000-0000-000000000001",
    "ip": "192.168.1.100",
    "user_agent": "Safari 13.0.5"
}
') as session_id \gset

-- Check if session registration succeeded
select results_eq(
    $$
        select
            user_id,
            ip,
            user_agent
        from session
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '192.168.1.100'::inet,
            'Safari 13.0.5'
        )
    $$,
    'Session should exist'
);
select is(
    session_id,
    :'session_id',
    'Returned session_id returned should be registered'
)
from session where user_id = '00000000-0000-0000-0000-000000000001';

-- Finish tests and rollback transaction
select * from finish();
rollback;
