-- Start transaction and plan tests
begin;
select plan(2);

-- Non existing repository
select is_empty(
    $$ select get_chart_repository_by_name('repo1') $$,
    'If repository requested does not exist no rows are returned'
);

-- Seed one chart repository
insert into chart_repository (chart_repository_id, name, display_name, url)
values ('00000000-0000-0000-0000-000000000001', 'repo1', 'Repo 1', 'https://repo1.com');

-- One repository has just been seeded
select is(
    get_chart_repository_by_name('repo1')::jsonb,
    '{
        "chart_repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com"
    }'::jsonb,
    'Repository just seeded is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
