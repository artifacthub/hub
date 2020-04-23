-- Start transaction and plan tests
begin;
select plan(3);

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

-- No repositories at this point
select is(
    get_org_chart_repositories(:'user1ID', 'org1')::jsonb,
    '[]'::jsonb,
    'With no repositories an empty json array is returned'
);

-- Seed some chart repositories
insert into chart_repository (
    chart_repository_id,
    name,
    display_name,
    url,
    last_tracking_ts,
    last_tracking_errors,
    organization_id
) values (
    '00000000-0000-0000-0000-000000000001',
    'repo1',
    'Repo 1',
    'https://repo1.com',
    '1970-01-01 00:00:00 UTC',
    'error1\nerror2\nerror3',
    :'org1ID'
);
insert into chart_repository (
    chart_repository_id,
    name,
    display_name,
    url,
    organization_id
) values (
    '00000000-0000-0000-0000-000000000002',
    'repo2',
    'Repo 2',
    'https://repo2.com',
    :'org1ID'
);
insert into chart_repository (
    chart_repository_id,
    name,
    display_name,
    url
) values (
    '00000000-0000-0000-0000-000000000003',
    'repo3',
    'Repo 3',
    'https://repo3.com'
);

-- Run some tests
select is(
    get_org_chart_repositories(:'user1ID', 'org1')::jsonb,
    '[{
        "chart_repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "last_tracking_ts": 0,
        "last_tracking_errors": "error1\\nerror2\\nerror3"
    }, {
        "chart_repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
        "url": "https://repo2.com",
        "last_tracking_ts": null,
        "last_tracking_errors": null
    }]'::jsonb,
    'Repositories belonging to user provided are returned as a json array of objects'
);
select is(
    get_org_chart_repositories(:'user2ID', 'org1')::jsonb,
    '[]'::jsonb,
    'No repositories are returned as user provided does not belong to the organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
