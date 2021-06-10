-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set user3ID '00000000-0000-0000-0000-000000000003'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set optOut1ID '00000000-0000-0000-0000-000000000001'
\set optOut2ID '00000000-0000-0000-0000-000000000002'
\set optOut3ID '00000000-0000-0000-0000-000000000003'
\set optOut4ID '00000000-0000-0000-0000-000000000004'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into "user" (user_id, alias, email)
values (:'user3ID', 'user3', 'user3@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut1ID', :'user1ID', :'repo1ID', 1);
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut2ID', :'user1ID', :'repo1ID', 2);
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut3ID', :'user1ID', :'repo2ID', 2);
insert into opt_out (opt_out_id, user_id, repository_id, event_kind_id)
values (:'optOut4ID', :'user2ID', :'repo1ID', 2);

-- Run some tests
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_opt_out_entries('00000000-0000-0000-0000-000000000001', 0, 0)
    $$,
    $$
        values (
            '[
                {
                    "opt_out_id": "00000000-0000-0000-0000-000000000001",
                    "repository": {
                        "repository_id": "00000000-0000-0000-0000-000000000001",
                        "name": "repo1",
                        "display_name": "Repo 1",
                        "url": "https://repo1.com",
                        "private": false,
                        "kind": 0,
                        "verified_publisher": false,
                        "official": false,
                        "scanner_disabled": false,
                        "user_alias": "user1"
                    },
                    "event_kind": 1
                },
                {
                    "opt_out_id": "00000000-0000-0000-0000-000000000002",
                    "repository": {
                        "repository_id": "00000000-0000-0000-0000-000000000001",
                        "name": "repo1",
                        "display_name": "Repo 1",
                        "url": "https://repo1.com",
                        "private": false,
                        "kind": 0,
                        "verified_publisher": false,
                        "official": false,
                        "scanner_disabled": false,
                        "user_alias": "user1"
                    },
                    "event_kind": 2
                },
                {
                    "opt_out_id": "00000000-0000-0000-0000-000000000003",
                    "repository": {
                        "repository_id": "00000000-0000-0000-0000-000000000002",
                        "name": "repo2",
                        "display_name": "Repo 2",
                        "url": "https://repo2.com",
                        "private": false,
                        "kind": 0,
                        "verified_publisher": false,
                        "official": false,
                        "scanner_disabled": false,
                        "organization_name": "org1",
                        "organization_display_name": "Organization 1"
                    },
                    "event_kind": 2
                }
            ]'::jsonb,
            3
        )
    $$,
    'Three opt-out entries should be returned for user1'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_opt_out_entries('00000000-0000-0000-0000-000000000001', 1, 1)
    $$,
    $$
        values (
            '[
                {
                    "opt_out_id": "00000000-0000-0000-0000-000000000002",
                    "repository": {
                        "repository_id": "00000000-0000-0000-0000-000000000001",
                        "name": "repo1",
                        "display_name": "Repo 1",
                        "url": "https://repo1.com",
                        "private": false,
                        "kind": 0,
                        "verified_publisher": false,
                        "official": false,
                        "scanner_disabled": false,
                        "user_alias": "user1"
                    },
                    "event_kind": 2
                }
            ]'::jsonb,
            3
        )
    $$,
    'Only one opt-out entry should be returned for user1 when using a limit and offset of 1'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_opt_out_entries('00000000-0000-0000-0000-000000000002', 0, 0)
    $$,
    $$
        values (
            '[
                {
                    "opt_out_id": "00000000-0000-0000-0000-000000000004",
                    "repository": {
                        "repository_id": "00000000-0000-0000-0000-000000000001",
                        "name": "repo1",
                        "display_name": "Repo 1",
                        "url": "https://repo1.com",
                        "private": false,
                        "kind": 0,
                        "verified_publisher": false,
                        "official": false,
                        "scanner_disabled": false,
                        "user_alias": "user1"
                    },
                    "event_kind": 2
                }
            ]'::jsonb,
            1
        )
    $$,
    'One opt-out entry should be returned for user2'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_opt_out_entries('00000000-0000-0000-0000-000000000003', 0, 0)
    $$,
    $$
        values ('[]'::jsonb, 0)
    $$,
    'No opt-out entries expected for user3'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
