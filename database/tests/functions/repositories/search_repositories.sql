-- Start transaction and plan tests
begin;
select plan(10);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'
\set repo4ID '00000000-0000-0000-0000-000000000004'


-- No repositories at this point
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{}')
    $$,
    $$
        values ('[]'::jsonb, 0)
    $$,
    'With no repositories an empty json array is returned'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org2ID', true);
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    cncf,
    auth_user,
    auth_pass,
    last_tracking_ts,
    last_tracking_errors,
    repository_kind_id,
    organization_id
) values (
    :'repo1ID',
    'repo1',
    'Repo 1',
    'https://repo1.com',
    true,
    'user',
    'pass',
    '1970-01-01 00:00:00 UTC',
    'error1\nerror2\nerror3',
    0,
    :'org1ID'
);
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    repository_kind_id,
    organization_id
) values (
    :'repo2ID',
    'repo2',
    'Repo 2',
    'https://repo2.com',
    0,
    :'org1ID'
);
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    repository_kind_id,
    user_id
) values (
    :'repo3ID',
    'repo3',
    'Repo 3',
    'https://repo3.com',
    1,
    :'user1ID'
);
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    repository_kind_id,
    organization_id
) values (
    :'repo4ID',
    'repo4',
    'Repo 4',
    'https://repo4.com',
    1,
    :'org2ID'
);

-- Run some tests
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{}')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "private": true,
                    "kind": 0,
                    "verified_publisher": false,
                    "official": false,
                    "cncf": true,
                    "disabled": false,
                    "scanner_disabled": false,
                    "last_tracking_ts": 0,
                    "last_tracking_errors": "error1\\nerror2\\nerror3",
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                },
                {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "kind": 0,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                },
                {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "kind": 1,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "user_alias": "user1"
                },
                {
                    "repository_id": "00000000-0000-0000-0000-000000000004",
                    "name": "repo4",
                    "display_name": "Repo 4",
                    "url": "https://repo4.com",
                    "kind": 1,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org2",
                    "organization_display_name": "Organization 2"
                }
            ]'::jsonb,
            4)
    $$,
    'No filters, all repositories returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "limit": 1,
            "offset": 1
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "kind": 0,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            ]'::jsonb,
            4)
    $$,
    'No filters, using a limit and offset of 1, repository 2 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "name": "repo2"
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "kind": 0,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            ]'::jsonb,
            1)
    $$,
    'Filtering by repo2 name, repository 2 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "kinds": [1]
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "kind": 1,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "user_alias": "user1"
                },
                {
                    "repository_id": "00000000-0000-0000-0000-000000000004",
                    "name": "repo4",
                    "display_name": "Repo 4",
                    "url": "https://repo4.com",
                    "kind": 1,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org2",
                    "organization_display_name": "Organization 2"
                }
            ]'::jsonb,
            2)
    $$,
    'Filtering by kind 1, repositories 3 and 4 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "kinds": [1],
            "orgs": ["org2"]
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000004",
                    "name": "repo4",
                    "display_name": "Repo 4",
                    "url": "https://repo4.com",
                    "kind": 1,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org2",
                    "organization_display_name": "Organization 2"
                }
            ]'::jsonb,
            1)
    $$,
    'Filtering by kind 1 and org2, repository 4 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "users": ["user1"]
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "kind": 1,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "user_alias": "user1"
                }
            ]'::jsonb,
            1)
    $$,
    'Filtering by user1, repository 3 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "kinds": [1],
            "orgs": ["org1"]
        }')
    $$,
    $$
        values ('[]'::jsonb, 0)
    $$,
    'Filtering by kind 1 and org1, no repositories returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "name": "repo1",
            "include_credentials": true
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "private": true,
                    "auth_user": "user",
                    "auth_pass": "pass",
                    "kind": 0,
                    "verified_publisher": false,
                    "official": false,
                    "cncf": true,
                    "disabled": false,
                    "scanner_disabled": false,
                    "last_tracking_ts": 0,
                    "last_tracking_errors": "error1\\nerror2\\nerror3",
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            ]'::jsonb,
            1)
    $$,
    'Filtering by repo1 name including credentials, repository 1 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_repositories('{
            "url": "https://repo2.com"
        }')
    $$,
    $$
        values (
            '[
                {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "kind": 0,
                    "verified_publisher": false,
                    "official": false,
                    "disabled": false,
                    "scanner_disabled": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            ]'::jsonb,
            1)
    $$,
    'Filtering by repo2 url, repository 2 returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
