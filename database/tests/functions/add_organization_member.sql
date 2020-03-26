-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set user3ID '00000000-0000-0000-0000-000000000003'
\set org1ID '00000000-0000-0000-0000-000000000001'

-- Seed user and organization
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user1ID', 'user1', 'firstname1', 'lastname1', 'user1@email.com');
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user2ID', 'user2', 'firstname2', 'lastname2', 'user2@email.com');
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user3ID', 'user3', 'firstname3', 'lastname3', 'user3@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);

-- Add organization member and check it succeeded
select add_organization_member(:'user1ID', 'org1', 'user2');
select results_eq(
    $$
        select user_id, confirmed
        from user__organization
        where user_id = '00000000-0000-0000-0000-000000000002'
        and organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000002'::uuid, false)
    $$,
    'User2 should have been added to organization1'
);

-- Try adding an organization member without the required privileges
select throws_ok(
    $$ select add_organization_member('00000000-0000-0000-0000-000000000003', 'org1', 'user2') $$,
    42501,
    'insufficient_privilege',
    'User3 should not be able to add members to organization1'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
