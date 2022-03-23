-- Start transaction and plan tests
begin;
select plan(2);

-- Seed user
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email, tfa_enabled)
values ('00000000-0000-0000-0000-000000000002', 'user2', 'user2@email.com', true);

-- Register session for user with 2fa disabled
select register_session('
{
    "session_id": "hashed-session-id-user1",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "ip": "192.168.1.100",
    "user_agent": "Safari 13.0.5"
}
') as approved \gset

-- Check if session registration succeeded
select results_eq(
    $$
        select
            session_id,
            user_id,
            ip,
            user_agent,
            approved
        from session
        where user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (
            'hashed-session-id-user1',
            '00000000-0000-0000-0000-000000000001'::uuid,
            '192.168.1.100'::inet,
            'Safari 13.0.5',
            true
        )
    $$,
    'Session for user1 should exist'
);

-- Register session for user with 2fa enabled
select register_session('
{
    "session_id": "hashed-session-id-user2",
    "user_id": "00000000-0000-0000-0000-000000000002"
}
') as approved \gset

-- Check if session registration succeeded
select results_eq(
    $$
        select
            session_id,
            approved
        from session
        where user_id = '00000000-0000-0000-0000-000000000002'
    $$,
    $$
        values (
            'hashed-session-id-user2',
            false
        )
    $$,
    'Session for user2 should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
