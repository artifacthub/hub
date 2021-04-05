-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set apikey1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into api_key (api_key_id, name, secret, created_at, user_id)
values (:'apikey1ID', 'apikey1', 'hashedSecret', '2020-05-29 13:55:00+02', :'user1ID');

-- Run some tests
select is(
    get_api_key(
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001'
    )::jsonb,
    '{
        "api_key_id": "00000000-0000-0000-0000-000000000001",
        "name": "apikey1",
        "created_at": 1590753300
    }'::jsonb,
    'Api key should exist'
);
select is_empty(
    $$
        select get_api_key(
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001'
        )::jsonb
    $$,
    'Api key should not be returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
