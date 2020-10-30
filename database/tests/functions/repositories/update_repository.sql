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

-- Try to update repository owned by a user by other user
select throws_ok(
    $$
        select update_repository('00000000-0000-0000-0000-000000000002', '
        {
            "name": "repo1",
            "display_name": "Repo 1 updated",
            "url": "https://repo1.com/updated",
            "auth_user": "user1",
            "auth_pass": "pass1"
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'Repository update should fail because requesting user is not the owner'
);

-- Try to update repository owned by organization by user not belonging to it
select throws_ok(
    $$
        select update_repository('00000000-0000-0000-0000-000000000002', '
        {
            "name": "repo2",
            "display_name": "Repo 2 updated",
            "url": "https://repo2.com/updated",
            "auth_user": "user1",
            "auth_pass": "pass1"
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'Repository update should fail because requesting user does not belong to owning organization'
);

-- Update repository owned by user
select update_repository(:'user1ID', '
{
    "name": "repo1",
    "display_name": "Repo 1 updated",
    "url": "https://repo1.com/updated",
    "auth_user": "user1",
    "auth_pass": "pass1"
}
'::jsonb);
select results_eq(
    $$
        select name, display_name, url, auth_user, auth_pass
        from repository
        where name = 'repo1'
    $$,
    $$
        values ('repo1', 'Repo 1 updated', 'https://repo1.com/updated', 'user1', 'pass1')
    $$,
    'Repository should have been updated by user who owns it'
);

-- Update repository owned by organization (requesting user belongs to organization)
select update_repository(:'user1ID', '
{
    "name": "repo2",
    "display_name": "Repo 2 updated",
    "url": "https://repo2.com/updated",
    "auth_user": "user1",
    "auth_pass": "pass1"
}
'::jsonb);
select results_eq(
    $$
        select name, display_name, url, auth_user, auth_pass
        from repository
        where name = 'repo2'
    $$,
    $$
        values ('repo2', 'Repo 2 updated', 'https://repo2.com/updated', 'user1', 'pass1')
    $$,
    'Repository should have been updated by user who belongs to owning organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
