-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'
\set webhook2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into webhook (webhook_id, name, url, user_id)
values (:'webhook1ID', 'webhook1', 'http://webhook1.url', :'user1ID');
insert into webhook (webhook_id, name, url, organization_id)
values (:'webhook2ID', 'webhook2', 'http://webhook2.url', :'org1ID');

-- Try to delete a webhook owned by a user by other user
select throws_ok(
    $$
        select delete_webhook(
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001'
        )
    $$,
    42501,
    'insufficient_privilege',
    'Webhook delete should fail because requesting user is not the owner'
);

-- Try to delete webhook owned by organization by user not belonging to it
select throws_ok(
    $$
        select delete_webhook(
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000002'
        )
    $$,
    42501,
    'insufficient_privilege',
    'Webhook delete should fail because requesting user does not belong to owning organization'
);

-- Delete webhook owned by user
select delete_webhook(:'user1ID', :'webhook1ID');
select is_empty(
    $$
        select * from webhook where name = 'webhook1'
    $$,
    'Webhook should have been deleted by user who owns it'
);

-- Delete webhook owned by organization (requesting user belongs to organization)
select delete_webhook(:'user1ID', :'webhook2ID');
select is_empty(
    $$
        select * from webhook where name = 'webhook2'
    $$,
    'Webhook should have been deleted by user who belongs to owning organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
