-- Start transaction and plan tests
begin;
select plan(6);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set org3ID '00000000-0000-0000-0000-000000000003'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org3ID', 'org3', 'Organization 3', 'Description 3', 'https://org3.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org3ID', true);
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into chart_repository (chart_repository_id, name, display_name, url, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', :'org1ID');

-- Try to transfer repository owned by a user to other user
select throws_ok(
    $$
        select transfer_chart_repository(
            'repo1',
            '00000000-0000-0000-0000-000000000002',
            null
        )
    $$,
    42501,
    'insufficient_privilege',
    'Chart repository transfer should fail because requesting user is not the owner'
);

-- Try to transfer repository owned by organization to user not belonging to it
select throws_ok(
    $$
        select transfer_chart_repository(
            'repo2',
            '00000000-0000-0000-0000-000000000002',
            null
        )
    $$,
    42501,
    'insufficient_privilege',
    'Chart repository transfer should fail because requesting user does not belong to owning organization'
);

-- Try to transfer repository owned by a user to an organization the user does
-- not belong to
select throws_ok(
    $$
        select transfer_chart_repository(
            'repo1',
            '00000000-0000-0000-0000-000000000001',
            'org2'
        )
    $$,
    42501,
    'insufficient_privilege',
    'Chart repository transfer should fail because requesting user does not belong to dst org'
);

-- Transfer org owned chart repository to user
select transfer_chart_repository(
    'repo2',
    '00000000-0000-0000-0000-000000000001',
    null
);
select results_eq(
    $$
        select user_id, organization_id
        from chart_repository
        where name = 'repo2'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000001'::uuid, null::uuid)
    $$,
    'Chart repository should have been transferred to user1'
);
select transfer_chart_repository(
    'repo2',
    '00000000-0000-0000-0000-000000000001',
    'org1'
);

-- Transfer org owned chart repository to other org
select transfer_chart_repository(
    'repo2',
    '00000000-0000-0000-0000-000000000001',
    'org3'
);
select results_eq(
    $$
        select user_id, organization_id
        from chart_repository
        where name = 'repo2'
    $$,
    $$
        values (null::uuid, '00000000-0000-0000-0000-000000000003'::uuid)
    $$,
    'Chart repository should have been transferred to org3'
);

-- Transfer user owned chart repository to org
select transfer_chart_repository(
    'repo1',
    '00000000-0000-0000-0000-000000000001',
    'org1'
);
select results_eq(
    $$
        select user_id, organization_id
        from chart_repository
        where name = 'repo1'
    $$,
    $$
        values (null::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    $$,
    'Chart repository should have been transferred to org1'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
