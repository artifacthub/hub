-- Start transaction and plan tests
begin;
select plan(8);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set code1ID 'code1'
\set code2ID 'code2'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into delete_user_code (delete_user_code_id, user_id, created_at)
values (:'code1ID', :'user1ID', current_timestamp);
insert into delete_user_code (delete_user_code_id, user_id, created_at)
values (:'code2ID', :'user2ID', current_timestamp - '30 minute'::interval);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org2ID', true);

-- Run some tests
select throws_ok(
    $$ select delete_user('00000000-0000-0000-0000-000000000001', 'invalid') $$,
    'P0001',
    'invalid delete user code',
    'Delete user failed because code was not valid'
);
select throws_ok(
    $$ select delete_user('00000000-0000-0000-0000-000000000002', 'code') $$,
    'P0001',
    'invalid delete user code',
    'Delete user failed because code had expired'
);
select delete_user(:'user1ID', 'code1') as email1 \gset
select is(
    :'email1'::text,
    'user1@email.com'::text,
    'User1 email should be returned'
);
select is_empty(
    $$ select * from "user" where user_id = '00000000-0000-0000-0000-000000000001' $$,
    'User should have been deleted'
);
select is_empty(
    $$ select * from delete_user_code where user_id = '00000000-0000-0000-0000-000000000001' $$,
    'Delete user code should have been deleted'
);
select is_empty(
    $$ select * from organization where name = 'org2' $$,
    'Organization 2 should have been deleted as user1 was the only member'
);
select isnt_empty(
    $$ select * from organization where name = 'org1' $$,
    'Organization 1 should not have been deleted as it has more members'
);
select is(
    count(*)::int,
    1::int,
    'Organization 1 should now have only 1 member'
)
from user__organization
where organization_id = '00000000-0000-0000-0000-000000000001';

-- Finish tests and rollback transaction
select * from finish();
rollback;
