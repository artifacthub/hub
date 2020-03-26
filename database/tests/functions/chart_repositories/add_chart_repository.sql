-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'

-- Seed user and organization
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);

-- Add chart repository owned by user
select add_chart_repository(:'user1ID', null, '
{
    "name": "repo1",
    "display_name": "Repository 1",
    "url": "repo1_url"
}
'::jsonb);
select results_eq(
    $$
        select
            name,
            display_name,
            url,
            user_id,
            organization_id
        from chart_repository
        where name = 'repo1'
    $$,
    $$
        values (
            'repo1',
            'Repository 1',
            'repo1_url',
            '00000000-0000-0000-0000-000000000001'::uuid,
            null::uuid
        )
    $$,
    'Chart repository owned by user should exist'
);

-- When an owning user and organization are provided, the organization takes precedence
select add_chart_repository(:'user1ID', 'org1', '
{
    "name": "repo2",
    "display_name": "Repository 2",
    "url": "repo2_url"
}
'::jsonb);
select results_eq(
    $$
        select
            name,
            display_name,
            url,
            user_id,
            organization_id
        from chart_repository
        where name = 'repo2'
    $$,
    $$
        values (
            'repo2',
            'Repository 2',
            'repo2_url',
            null::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Chart repository should exist and be owned by organization'
);

-- An owning user or organization must be provided
select throws_ok(
    $$
        select add_chart_repository(null, null, '
        {
            "name": "repo3",
            "display_name": "Repository 3",
            "url": "repo3_url"
        }
        '::jsonb)
    $$,
    'owner user or organization must be provided'
);

-- Add chart repository owned by organization, but user does not belong to it
select throws_ok(
    $$
        select add_chart_repository('00000000-0000-0000-0000-000000000009', 'org1', '
        {
            "name": "repo4",
            "display_name": "Repository 4",
            "url": "repo4_url"
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'User not belonging to organization should not be able to add repos in its name'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
