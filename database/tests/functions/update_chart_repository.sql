-- Start transaction and plan tests
begin;
select plan(1);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'

-- Seed user and chart repository
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com');

-- Update chart repository
select update_chart_repository('
{
    "name": "repo1",
    "display_name": "Repo 1 updated",
    "url": "https://repo1.com/updated",
    "user_id": "00000000-0000-0000-0000-000000000001"
}
'::jsonb);

-- Check the chart repository was updated as expected
select results_eq(
    'select name, display_name, url from chart_repository order by name asc',
    $$ values
        ('repo1', 'Repo 1 updated', 'https://repo1.com/updated'),
        ('repo2', 'Repo 2', 'https://repo2.com')
    $$,
    'Chart repository should have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
