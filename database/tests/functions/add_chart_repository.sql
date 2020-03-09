-- Start transaction and plan tests
begin;
select plan(3);

-- Seed user
insert into "user" (user_id, alias, email)
values ('00000000-0000-0000-0000-000000000001', 'user1', 'user1@email.com');

-- Add chart repository
select add_chart_repository('
{
    "name": "repo1",
    "display_name": "Repository 1",
    "url": "repo1_url",
    "user_id": "00000000-0000-0000-0000-000000000001"
}
'::jsonb);

-- Check if chart repository was added successfully
select results_eq(
    $$
        select
            name,
            display_name,
            url,
            user_id
        from chart_repository
    $$,
    $$
        values (
            'repo1',
            'Repository 1',
            'repo1_url',
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Chart repository should exist'
);

-- Try adding a repository with an empty user id or not providing a user id
select throws_ok(
    $$
        select add_chart_repository('
        {
            "name": "repo2",
            "display_name": "Repository 2",
            "url": "repo2_url",
            "user_id": ""
        }
        ')
    $$,
    'invalid input syntax for type uuid: ""',
    'User id cannot be empty'
);
select throws_ok(
    $$
        select add_chart_repository('
        {
            "name": "repo2",
            "display_name": "Repository 2",
            "url": "repo2_url"
        }
        ')
    $$,
    'a valid user_id must be provided',
    'User id must be provided'
);


-- Finish tests and rollback transaction
select * from finish();
rollback;
