-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set user3ID '00000000-0000-0000-0000-000000000003'
\set apikey1ID '00000000-0000-0000-0000-000000000001'
\set apikey2ID '00000000-0000-0000-0000-000000000002'
\set apikey3ID '00000000-0000-0000-0000-000000000003'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into api_key (api_key_id, name, secret, created_at, user_id)
values (:'apikey1ID', 'apikey1', 'hashedSecret', '2020-05-29 13:55:00+02', :'user1ID');
insert into api_key (api_key_id, name, secret, created_at, user_id)
values (:'apikey2ID', 'apikey2', 'hashedSecret', '2020-05-29 13:55:00+02', :'user1ID');
insert into api_key (api_key_id, name, secret, created_at, user_id)
values (:'apikey3ID', 'apikey3', 'hashedSecret', '2020-05-29 13:55:00+02', :'user2ID');

-- Run some tests
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_api_keys('00000000-0000-0000-0000-000000000001', 0, 0)
    $$,
    $$
        values(
            '[
                {
                    "api_key_id": "00000000-0000-0000-0000-000000000001",
                    "name": "apikey1",
                    "created_at": 1590753300
                },
                {
                    "api_key_id": "00000000-0000-0000-0000-000000000002",
                    "name": "apikey2",
                    "created_at": 1590753300
                }
            ]'::jsonb,
            2)
    $$,
    'Api keys 1 and 2 should be returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_api_keys('00000000-0000-0000-0000-000000000001', 1, 1)
    $$,
    $$
        values(
            '[
                {
                    "api_key_id": "00000000-0000-0000-0000-000000000002",
                    "name": "apikey2",
                    "created_at": 1590753300
                }
            ]'::jsonb,
            2)
    $$,
    'Api key 2 should be returned when using a limit and offset of 1'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_api_keys('00000000-0000-0000-0000-000000000002', 0, 0)
    $$,
    $$
        values(
            '[
                {
                    "api_key_id": "00000000-0000-0000-0000-000000000003",
                    "name": "apikey3",
                    "created_at": 1590753300
                }
            ]'::jsonb,
            1)
    $$,
    'Api key 3 should be returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_api_keys('00000000-0000-0000-0000-000000000003', 0, 0)
    $$,
    $$
        values('[]'::jsonb, 0)
    $$,
    'An empty list of api keys should be returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
