-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed user
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');

-- No repositories at this point
select is(
    get_chart_repositories_by_user(:'user1ID')::jsonb,
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
    user_id
) values (
    '00000000-0000-0000-0000-000000000001',
    'repo1',
    'Repo 1',
    'https://repo1.com',
    '1970-01-01 00:00:00 UTC',
    'error1\nerror2\nerror3',
    :'user1ID'
);
insert into chart_repository (
    chart_repository_id,
    name,
    display_name,
    url,
    user_id
) values (
    '00000000-0000-0000-0000-000000000002',
    'repo2',
    'Repo 2',
    'https://repo2.com',
    :'user1ID'
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

-- Some repositories have just been seeded
select is(
    get_chart_repositories_by_user(:'user1ID')::jsonb,
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
    get_chart_repositories_by_user(null)::jsonb,
    '[]'::jsonb,
    'Repositories not belonging to any user are not returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
