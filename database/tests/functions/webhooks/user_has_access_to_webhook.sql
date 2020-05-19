-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set webhook1ID '00000000-0000-0000-0000-000000000001'
\set webhook2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into user__organization (user_id, organization_id) values(:'user1ID', :'org1ID');
insert into webhook (webhook_id, name, url, user_id)
values (:'webhook1ID', 'webhook1', 'http://webhook1.url', :'user1ID');
insert into webhook (webhook_id, name, url, organization_id)
values (:'webhook2ID', 'webhook2', 'http://webhook2.url', :'org1ID');

-- Run some tests
select is(
    user_has_access_to_webhook(:'user1ID', :'webhook2ID'),
    false,
    'No, as user1 does not belong to org1 as it is not confirmed yet'
);
update "user__organization" set confirmed = true
where user_id = :'user1ID' and organization_id = :'org1ID';
select is(
    user_has_access_to_webhook(:'user1ID', :'webhook2ID'),
    true,
    'Yes, as now user1 belongs to org1'
);
select is(
    user_has_access_to_webhook(:'user1ID', :'webhook1ID'),
    true,
    'Yes, as user1 is the owner'
);
select is(
    user_has_access_to_webhook(:'user2ID', :'webhook1ID'),
    false,
    'No, as user1 is the owner '
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
