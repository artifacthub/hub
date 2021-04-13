-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'

-- Seed users
insert into "user" (
    user_id,
    alias,
    email,
    tfa_enabled,
    tfa_recovery_codes,
    tfa_url
) values (
    :'user1ID',
    'user1',
    'user1@email.com',
    true,
    '{"code1", "code2"}',
    'url'
);
insert into "user" (
    user_id,
    alias,
    email
) values (
    :'user2ID',
    'user2',
    'user2@email.com'
);

-- Run some tests
select is(
    get_user_tfa_config(:'user1ID')::jsonb, '
    {
        "enabled": true,
        "recovery_codes": ["code1", "code2"],
        "url": "url"
    }
    '::jsonb,
    'User1 tfa config should exist'
);
select is(
    get_user_tfa_config(:'user2ID')::jsonb, '{}'::jsonb,
    'User2 tfa config should be empty'
);
select is_empty(
    $$ select get_user_profile('00000000-0000-0000-0000-000000000003')::jsonb $$,
    'User3 tfa config should not exist'
);


-- Finish tests and rollback transaction
select * from finish();
rollback;
