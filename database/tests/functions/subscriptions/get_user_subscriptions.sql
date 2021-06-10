-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into snapshot (package_id, version, logo_image_id)
values (:'package1ID', '1.0.0', :'image1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package2ID', 'Package 2', '1.0.0', :'repo2ID');
insert into snapshot (package_id, version, logo_image_id)
values (:'package2ID', '1.0.0', :'image2ID');
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 0);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 1);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package2ID', 0);

-- Run some tests
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_subscriptions('00000000-0000-0000-0000-000000000001', 0, 0)
    $$,
    $$
        values (
            '[
                {
                    "package_id": "00000000-0000-0000-0000-000000000001",
                    "name": "Package 1",
                    "normalized_name": "package-1",
                    "logo_image_id": "00000000-0000-0000-0000-000000000001",
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
                    "event_kinds": [0, 1]
                },
                {
                    "package_id": "00000000-0000-0000-0000-000000000002",
                    "name": "Package 2",
                    "normalized_name": "package-2",
                    "logo_image_id": "00000000-0000-0000-0000-000000000002",
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
                    "event_kinds": [0]
                }
            ]'::jsonb,
            2
        )
    $$,
    'Two subscriptions should be returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_subscriptions('00000000-0000-0000-0000-000000000001', 1, 1)
    $$,
    $$
        values (
            '[
                {
                    "package_id": "00000000-0000-0000-0000-000000000002",
                    "name": "Package 2",
                    "normalized_name": "package-2",
                    "logo_image_id": "00000000-0000-0000-0000-000000000002",
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
                    "event_kinds": [0]
                }
            ]'::jsonb,
            2
        )
    $$,
    'Only one subscription returned when using a limit and offset of 1'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_subscriptions('00000000-0000-0000-0000-000000000002', 0, 0)
    $$,
    $$
        values ('[]'::jsonb, 0)
    $$,
    'No subscriptions expected for user2'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
