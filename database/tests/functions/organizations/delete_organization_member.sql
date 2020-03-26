-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'

-- Seed some users and an organization
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user1ID', 'user1', 'firstname1', 'lastname1', 'user1@email.com');
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user2ID', 'user2', 'firstname2', 'lastname2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org1ID', true);

-- Users and organization have been seeded
select results_eq(
    $$
        select user_id
        from user__organization
        where organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values
        ('00000000-0000-0000-0000-000000000001'::uuid),
        ('00000000-0000-0000-0000-000000000002'::uuid)
    $$,
    'User1 and user2 should belong to organization1'
);

-- Delete organization member and check it succeeded
select delete_organization_member(:'user1ID', 'org1', 'user2');
select results_eq(
    $$
        select user_id
        from user__organization
        where organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000001'::uuid)
    $$,
    'User2 should not belong to organization1 anymore'
);

-- Try again using a user not belonging to the organization
select throws_ok(
    $$ select delete_organization_member('00000000-0000-0000-0000-000000000002', 'org1', 'user1') $$,
    42501,
    'insufficient_privilege',
    'User2 should not be able to delete an organization1 member'
);

-- Last user in the organization cannot leave it
select throws_ok(
    $$ select delete_organization_member('00000000-0000-0000-0000-000000000001', 'org1', 'user1') $$,
    'last member of an organization cannot leave it',
    'User1 should not be able to leave organization1'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
