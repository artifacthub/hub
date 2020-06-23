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
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');

-- Try to delete a repository owned by a user by other user
select throws_ok(
    $$
        select delete_repository('00000000-0000-0000-0000-000000000002', 'repo1')
    $$,
    42501,
    'insufficient_privilege',
    'Repository delete should fail because requesting user is not the owner'
);

-- Try to delete repository owned by organization by user not belonging to it
select throws_ok(
    $$
        select delete_repository('00000000-0000-0000-0000-000000000002', 'repo2')
    $$,
    42501,
    'insufficient_privilege',
    'Repository delete should fail because requesting user does not belong to owning organization'
);

-- Delete repository owned by user
select delete_repository(:'user1ID', 'repo1');
select is_empty(
    $$
        select name, display_name, url
        from repository
        where name = 'repo1'
    $$,
    'Repository should have been deleted by user who owns it'
);

-- Delete repository owned by organization (requesting user belongs to organization)
select delete_repository(:'user1ID', 'repo2');
select is_empty(
    $$
        select name, display_name, url
        from repository
        where name = 'repo2'
    $$,
    'Repository should have been deleted by user who belongs to owning organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
