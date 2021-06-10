-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'
\set webhook2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    logo_image_id,
    ts
) values (
    :'package1ID',
    '1.0.0',
    :'image1ID',
    '2020-06-16 11:20:34+02'
);
insert into webhook (
    webhook_id,
    name,
    description,
    url,
    secret,
    content_type,
    template,
    active,
    user_id
) values (
    :'webhook1ID',
    'webhook1',
    'description',
    'http://webhook1.url',
    'very',
    'application/json',
    'custom payload',
    true,
    :'user1ID'
);
insert into webhook (
    webhook_id,
    name,
    description,
    url,
    secret,
    content_type,
    template,
    active,
    user_id
) values (
    :'webhook2ID',
    'webhook2',
    'description',
    'http://webhook2.url',
    'very',
    'application/json',
    'custom payload',
    true,
    :'user1ID'
);
insert into webhook__event_kind (webhook_id, event_kind_id) values (:'webhook1ID', 0);
insert into webhook__event_kind (webhook_id, event_kind_id) values (:'webhook2ID', 1);
insert into webhook__package (webhook_id, package_id) values (:'webhook1ID', :'package1ID');
insert into webhook__package (webhook_id, package_id) values (:'webhook2ID', :'package1ID');

-- Run some tests
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_webhooks('00000000-0000-0000-0000-000000000001', 0, 0)
    $$,
    $$
        values(
            '[
                {
                    "webhook_id": "00000000-0000-0000-0000-000000000001",
                    "name": "webhook1",
                    "description": "description",
                    "url": "http://webhook1.url",
                    "secret": "very",
                    "content_type": "application/json",
                    "template": "custom payload",
                    "active": true,
                    "event_kinds": [0],
                    "packages": [
                        {
                            "package_id": "00000000-0000-0000-0000-000000000001",
                            "name": "Package 1",
                            "normalized_name": "package-1",
                            "stars": 0,
                            "version": "1.0.0",
                            "logo_image_id": "00000000-0000-0000-0000-000000000001",
                            "ts": 1592299234,
                            "repository": {
                                "repository_id": "00000000-0000-0000-0000-000000000001",
                                "kind": 0,
                                "name": "repo1",
                                "display_name": "Repo 1",
                                "url": "https://repo1.com",
                                "private": false,
                                "verified_publisher": false,
                                "official": false,
                                "scanner_disabled": false,
                                "user_alias": "user1"
                            }
                        }
                    ]
                },
                {
                    "webhook_id": "00000000-0000-0000-0000-000000000002",
                    "name": "webhook2",
                    "description": "description",
                    "url": "http://webhook2.url",
                    "secret": "very",
                    "content_type": "application/json",
                    "template": "custom payload",
                    "active": true,
                    "event_kinds": [1],
                    "packages": [
                        {
                            "package_id": "00000000-0000-0000-0000-000000000001",
                            "name": "Package 1",
                            "normalized_name": "package-1",
                            "stars": 0,
                            "version": "1.0.0",
                            "logo_image_id": "00000000-0000-0000-0000-000000000001",
                            "ts": 1592299234,
                            "repository": {
                                "repository_id": "00000000-0000-0000-0000-000000000001",
                                "kind": 0,
                                "name": "repo1",
                                "display_name": "Repo 1",
                                "url": "https://repo1.com",
                                "private": false,
                                "verified_publisher": false,
                                "official": false,
                                "scanner_disabled": false,
                                "user_alias": "user1"
                            }
                        }
                    ]
                }
            ]'::jsonb,
            2)
    $$,
    'Two webhooks owned by user1 should be returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_webhooks('00000000-0000-0000-0000-000000000001', 1, 1)
    $$,
    $$
        values(
            '[
                {
                    "webhook_id": "00000000-0000-0000-0000-000000000002",
                    "name": "webhook2",
                    "description": "description",
                    "url": "http://webhook2.url",
                    "secret": "very",
                    "content_type": "application/json",
                    "template": "custom payload",
                    "active": true,
                    "event_kinds": [1],
                    "packages": [
                        {
                            "package_id": "00000000-0000-0000-0000-000000000001",
                            "name": "Package 1",
                            "normalized_name": "package-1",
                            "stars": 0,
                            "version": "1.0.0",
                            "logo_image_id": "00000000-0000-0000-0000-000000000001",
                            "ts": 1592299234,
                            "repository": {
                                "repository_id": "00000000-0000-0000-0000-000000000001",
                                "kind": 0,
                                "name": "repo1",
                                "display_name": "Repo 1",
                                "url": "https://repo1.com",
                                "private": false,
                                "verified_publisher": false,
                                "official": false,
                                "scanner_disabled": false,
                                "user_alias": "user1"
                            }
                        }
                    ]
                }
            ]'::jsonb,
            2)
    $$,
    'Only webhook2 owned by user1 should be returned when using a limit and offset of 1'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_webhooks('00000000-0000-0000-0000-000000000002', 0, 0)
    $$,
    $$
        values('[]'::jsonb, 0)
    $$,
    'No webhooks are expected as user2 owns none'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
