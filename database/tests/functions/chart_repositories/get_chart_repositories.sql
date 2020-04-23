-- Start transaction and plan tests
begin;
select plan(2);

-- No repositories at this point
select is(
    get_chart_repositories()::jsonb,
    '[]'::jsonb,
    'With no repositories an empty json array is returned'
);

-- Seed some chart repositories
insert into chart_repository (chart_repository_id, name, display_name, url)
values ('00000000-0000-0000-0000-000000000001', 'repo1', 'Repo 1', 'https://repo1.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values ('00000000-0000-0000-0000-000000000002', 'repo2', 'Repo 2', 'https://repo2.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values ('00000000-0000-0000-0000-000000000003', 'repo3', 'Repo 3', 'https://repo3.com');

-- Run some tests
select is(
    get_chart_repositories()::jsonb,
    '[{
        "chart_repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com"
    }, {
        "chart_repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
        "url": "https://repo2.com"
    }, {
        "chart_repository_id": "00000000-0000-0000-0000-000000000003",
        "name": "repo3",
        "display_name": "Repo 3",
        "url": "https://repo3.com"
    }]'::jsonb,
    'Repositories are returned as a json array of objects'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
