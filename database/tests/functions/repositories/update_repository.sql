-- Start transaction and plan tests
begin;
select plan(10);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into repository (repository_id, name, display_name, url, digest, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 'digest', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, branch, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 'main', 0, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    :'repo1ID'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'Package 2',
    '1.0.0',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    security_report,
    security_report_created_at,
    security_report_summary
) values (
    :'package2ID',
    '1.0.0',
    '{"k": "v"}',
    '2020-06-16 11:20:38+02',
    '{"k": "v"}'
);

-- Try to update repository owned by a user by other user
select throws_ok(
    $$
        select update_repository('00000000-0000-0000-0000-000000000002', '
        {
            "name": "repo1",
            "display_name": "Repo 1 updated",
            "url": "https://repo1.com/updated",
            "branch": "main",
            "auth_user": "user1",
            "auth_pass": "pass1",
            "disabled": false,
            "scanner_disabled": false
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
            "branch": "main",
            "auth_user": "user1",
            "auth_pass": "pass1",
            "disabled": false,
            "scanner_disabled": false
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'Repository update should fail because requesting user does not belong to owning organization'
);

-- Update repository owned by user disabling it
select update_repository(:'user1ID', '
{
    "name": "repo1",
    "display_name": "Repo 1 updated",
    "url": "https://repo1.com/updated",
    "branch": "main",
    "auth_user": "user1",
    "auth_pass": "pass1",
    "disabled": true,
    "scanner_disabled": false,
    "data": {"k1": "v1"}
}
'::jsonb);
select results_eq(
    $$
        select
            name,
            display_name,
            url,
            branch,
            auth_user,
            auth_pass,
            disabled,
            digest,
            data
        from repository
        where name = 'repo1'
    $$,
    $$
        values (
            'repo1',
            'Repo 1 updated',
            'https://repo1.com/updated',
            'main',
            'user1',
            'pass1',
            true,
            null,
            '{"k1": "v1"}'::jsonb
        )
    $$,
    'Repository should have been updated by user who owns it'
);
select is_empty(
    $$ select * from package where repository_id = '00000000-0000-0000-0000-000000000001' $$,
    'Packages belonging to repo1 should have been deleted'
);

-- Update same repository again providing shadowed credentials
select update_repository(:'user1ID', '
{
    "name": "repo1",
    "display_name": "Repo 1 updated",
    "url": "https://repo1.com/updated",
    "branch": "main",
    "auth_user": "=",
    "auth_pass": "=",
    "disabled": true,
    "scanner_disabled": false
}
'::jsonb);
select results_eq(
    $$
        select name, display_name, url, branch, auth_user, auth_pass, disabled, digest
        from repository
        where name = 'repo1'
    $$,
    $$
        values ('repo1', 'Repo 1 updated', 'https://repo1.com/updated', 'main', 'user1', 'pass1', true, null)
    $$,
    'Repository credentials should not have been updated'
);

-- Update same repository again providing shadowed credentials (wrong number of asterisks in user)
select update_repository(:'user1ID', '
{
    "name": "repo1",
    "display_name": "Repo 1 updated",
    "url": "https://repo1.com/updated",
    "branch": "main",
    "auth_user": "updated",
    "auth_pass": "=",
    "disabled": true,
    "scanner_disabled": false
}
'::jsonb);
select results_eq(
    $$
        select name, display_name, url, branch, auth_user, auth_pass, disabled, digest
        from repository
        where name = 'repo1'
    $$,
    $$
        values ('repo1', 'Repo 1 updated', 'https://repo1.com/updated', 'main', 'updated', 'pass1', true, null)
    $$,
    'Repository credentials should have been updated (username updated)'
);

-- Update same repository again removing credentials
select update_repository(:'user1ID', '
{
    "name": "repo1",
    "display_name": "Repo 1 updated",
    "url": "https://repo1.com/updated",
    "branch": "main",
    "auth_user": "",
    "auth_pass": "",
    "disabled": true,
    "scanner_disabled": false
}
'::jsonb);
select results_eq(
    $$
        select name, display_name, url, branch, auth_user, auth_pass, disabled, digest
        from repository
        where name = 'repo1'
    $$,
    $$
        values ('repo1', 'Repo 1 updated', 'https://repo1.com/updated', 'main', null, null, true, null)
    $$,
    'Repository credentials should have been removed'
);

-- Update repository owned by organization (requesting user belongs to
-- organization) disabling security scanning
select update_repository(:'user1ID', '
{
    "name": "repo2",
    "display_name": "Repo 2 updated",
    "url": "https://repo2.com/updated",
    "auth_user": "user1",
    "auth_pass": "pass1",
    "disabled": false,
    "scanner_disabled": true
}
'::jsonb);
select results_eq(
    $$
        select name, display_name, url, branch, auth_user, auth_pass, disabled
        from repository
        where name = 'repo2'
    $$,
    $$
        values ('repo2', 'Repo 2 updated', 'https://repo2.com/updated', null, 'user1', 'pass1', false)
    $$,
    'Repository should have been updated by user who belongs to owning organization'
);
select isnt_empty(
    $$ select * from package where repository_id = '00000000-0000-0000-0000-000000000002' $$,
    'Packages belonging to repo2 should not have been deleted'
);
select results_eq(
    $$
        select security_report, security_report_created_at, security_report_summary
        from snapshot
        where package_id = '00000000-0000-0000-0000-000000000002'
    $$,
    $$
        values (null::jsonb, null::timestamptz, null::jsonb)
    $$,
    'Security reports in packages belonging to repo2 should have been deleted'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
