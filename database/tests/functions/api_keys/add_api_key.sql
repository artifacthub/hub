-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');

-- Add api key
select add_api_key('
{
    "name": "apikey1",
    "secret": "hashed-secret",
    "user_id": "00000000-0000-0000-0000-000000000001"
}
'::jsonb);

-- Check if api_key was added successfully
select results_eq(
    $$
        select
            name,
            secret,
            user_id
        from api_key
    $$,
    $$
        values (
            'apikey1',
            'hashed-secret',
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Api key should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
