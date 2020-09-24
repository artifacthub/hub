-- Start transaction and plan tests
begin;
select plan(7);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set optOut1ID '00000000-0000-0000-0000-000000000001'
\set optOut2ID '00000000-0000-0000-0000-000000000002'

-- Seed some users and an organization
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user1ID', 'user1', 'firstname1', 'lastname1', 'user1@email.com');
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user2ID', 'user2', 'firstname2', 'lastname2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org2ID', true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org2ID');
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut1ID', :'user2ID', :'repo1ID', 1);
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut2ID', :'user2ID', :'repo2ID', 1);

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
select isnt_empty(
    $$
        select *
        from opt_out
        where user_id = '00000000-0000-0000-0000-000000000002'
        and repository_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User2 should have one opt-out entry for repo1'
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
select is_empty(
    $$
        select *
        from opt_out
        where user_id = '00000000-0000-0000-0000-000000000002'
        and repository_id = '00000000-0000-0000-0000-000000000001'
    $$,
    'User2 should not have any opt-out entries for repo1'
);
select isnt_empty(
    $$
        select *
        from opt_out
        where user_id = '00000000-0000-0000-0000-000000000002'
        and repository_id = '00000000-0000-0000-0000-000000000002'
    $$,
    'User2 should have one opt-out entry for repo2'
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
