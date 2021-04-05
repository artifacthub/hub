-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set apikey1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into api_key (api_key_id, name, secret, user_id)
values (:'apikey1ID', 'apikey1', 'hashedSecret', :'user1ID');

-- Update api key
select update_api_key('
{
    "api_key_id": "00000000-0000-0000-0000-000000000001",
    "name": "apikey1-updated",
    "user_id": "00000000-0000-0000-0000-000000000001"
}
'::jsonb);

-- Check if api key was updated successfully
select results_eq(
    $$
        select name from api_key where api_key_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values ('apikey1-updated')
    $$,
    'Api key name should have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
