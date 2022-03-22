-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'

-- Seed user and organization
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);

-- User not belonging to an organization tries to delete it
select throws_ok(
    $$
        select delete_organization('00000000-0000-0000-0000-000000000002', 'org1')
    $$,
    42501,
    'insufficient_privilege',
    'Organization delete should fail because requesting user does not belong to it'
);

-- User belonging to an organization deletes it
select delete_organization(:'user1ID', 'org1');
select is_empty(
    $$
        select name from organization where name = 'org1'
    $$,
    'Organization should have been deleted by user who belongs to it'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
