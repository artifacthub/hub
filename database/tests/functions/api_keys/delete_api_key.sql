-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set apikey1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into api_key (api_key_id, name, secret, user_id)
values (:'apikey1ID', 'apikey1', 'hashedSecret', :'user1ID');

-- Try to delete api key by non owner
select delete_api_key(:'user2ID', :'apikey1ID');
select isnt_empty(
    $$
        select *
        from api_key
        where api_key_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'Api key should still exist'
);

-- Delete api key
select delete_api_key(:'user1ID', :'apikey1ID');
select is_empty(
    $$
        select *
        from api_key
        where api_key_id = '00000000-0000-0000-0000-000000000001'
        and user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'Api key should not exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
