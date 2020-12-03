-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'
\set repo4ID '00000000-0000-0000-0000-000000000004'

-- Seed user and organization
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org2ID', true);

-- No repositories at this point
select is(
    get_org_repositories(:'user1ID', 'org1', false)::jsonb,
    '[]'::jsonb,
    'With no repositories an empty json array is returned'
);

-- Seed some repositories
insert into repository (
    repository_id,
    name,
    display_name,
    url,
    last_tracking_ts,
    last_tracking_errors,
    repository_kind_id,
    organization_id
) values (
    :'repo1ID',
    'repo1',
    'Repo 1',
    'https://repo1.com',
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
select is(
    get_org_repositories(:'user1ID', 'org1', false)::jsonb,
    '[{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "disabled": false,
        "scanner_disabled": false,
        "last_tracking_ts": 0,
        "last_tracking_errors": "error1\\nerror2\\nerror3",
        "organization_name": "org1",
        "organization_display_name": "Organization 1"
    }, {
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
    }]'::jsonb,
    'Repositories belonging to user provided are returned as a json array of objects'
);
select is(
    get_org_repositories(:'user2ID', 'org1', false)::jsonb,
    '[]'::jsonb,
    'No repositories are returned as user provided does not belong to the organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
