-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set user3ID '00000000-0000-0000-0000-000000000003'
\set user4ID '00000000-0000-0000-0000-000000000004'
\set user5ID '00000000-0000-0000-0000-000000000005'
\set user6ID '00000000-0000-0000-0000-000000000006'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into "user" (user_id, alias, email)
values (:'user3ID', 'user3', 'user3@email.com');
insert into "user" (user_id, alias, email)
values (:'user4ID', 'user4', 'user4@email.com');
insert into "user" (user_id, alias, email)
values (:'user5ID', 'user5', 'user5@email.com');
insert into "user" (user_id, alias, email, repositories_notifications_disabled)
values (:'user6ID', 'user6', 'user6@email.com', true);
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user3ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user4ID', :'org1ID', false);
insert into user__organization (user_id, organization_id, confirmed) values(:'user5ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user6ID', :'org1ID', true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into opt_out (user_id, repository_id, event_kind_id) values (:'user5ID', :'repo2ID', 2);

-- Run some tests
select is(
    get_repository_subscriptors(:'repo1ID', 2)::jsonb,
    '[
        {
            "user_id": "00000000-0000-0000-0000-000000000001"
        }
    ]'::jsonb,
    'One subscriptor expected for repo1'
);
select is(
    get_repository_subscriptors(:'repo2ID', 2)::jsonb,
    '[
        {
            "user_id": "00000000-0000-0000-0000-000000000002"
        },
        {
            "user_id": "00000000-0000-0000-0000-000000000003"
        }
    ]'::jsonb,
    'Two subscriptors expected for repo2'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
