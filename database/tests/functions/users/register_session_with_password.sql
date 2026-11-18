-- Start transaction and plan tests
begin;
select plan(5);

-- Seed user
insert into "user" (user_id, alias, email, password)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com', 'hash1');
insert into "user" (user_id, alias, email, password, tfa_enabled)
values ('00000000-0000-0000-0000-000000000002', 'user2', 'user2@email.com', 'hash2', true);

-- Register session for user with 2fa disabled
select is(
    register_session_with_password('
    {
        "session_id": "hashed-session-id-user1",
        "user_id": "00000000-0000-0000-0000-000000000001"
    }
    ', 'hash1'),
    true,
    'Session for user1 should be approved'
);

-- Register session for user with 2fa enabled
select is(
    register_session_with_password('
    {
        "session_id": "hashed-session-id-user2",
        "user_id": "00000000-0000-0000-0000-000000000002"
    }
    ', 'hash2'),
    false,
    'Session for user2 should not be approved'
);

-- Check if sessions registration succeeded
select results_eq(
    $$
        select
            session_id,
            user_id,
            approved
        from session
        order by session_id collate "C"
    $$,
    $$
        values
            ('hashed-session-id-user1', '00000000-0000-0000-0000-000000000001'::uuid, true),
            ('hashed-session-id-user2', '00000000-0000-0000-0000-000000000002'::uuid, false)
    $$,
    'Sessions for user1 and user2 should exist'
);

-- Try registering session with a password that is no longer the current one
select throws_ok(
    $$
        select register_session_with_password('
        {
            "session_id": "hashed-session-id-user1-2",
            "user_id": "00000000-0000-0000-0000-000000000001"
        }
        ', 'hash0')
    $$,
    'P0001',
    'password changed',
    'Session should not be registered when the password has changed'
);
select is_empty(
    $$
        select * from session
        where session_id = 'hashed-session-id-user1-2'
    $$,
    'No session should have been registered when the password has changed'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
