-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into chart_repository (chart_repository_id, name, display_name, url, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', :'org1ID');

-- Try to delete a chart repository owned by a user by other user
select throws_ok(
    $$
        select delete_chart_repository('00000000-0000-0000-0000-000000000002', 'repo1')
    $$,
    42501,
    'insufficient_privilege',
    'Chart repository delete should fail because requesting user is not the owner'
);

-- Try to delete repository owned by organization by user not belonging to it
select throws_ok(
    $$
        select delete_chart_repository('00000000-0000-0000-0000-000000000002', 'repo2')
    $$,
    42501,
    'insufficient_privilege',
    'Chart repository delete should fail because requesting user does not belong to owning organization'
);

-- Delete chart repository owned by user
select delete_chart_repository(:'user1ID', 'repo1');
select is_empty(
    $$
        select name, display_name, url
        from chart_repository
        where name = 'repo1'
    $$,
    'Chart repository should have been deleted by user who owns it'
);

-- Delete chart repository owned by organization (requesting user belongs to organization)
select delete_chart_repository(:'user1ID', 'repo2');
select is_empty(
    $$
        select name, display_name, url
        from chart_repository
        where name = 'repo2'
    $$,
    'Chart repository should have been deleted by user who belongs to owning organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
