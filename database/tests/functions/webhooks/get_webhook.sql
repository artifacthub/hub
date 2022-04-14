-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'
\set event1ID '00000000-0000-0000-0000-000000000001'
\set event2ID '00000000-0000-0000-0000-000000000002'
\set notification1ID '00000000-0000-0000-0000-000000000001'
\set notification2ID '00000000-0000-0000-0000-000000000002'

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
insert into webhook__event_kind (webhook_id, event_kind_id) values (:'webhook1ID', 0);
insert into webhook__package (webhook_id, package_id) values (:'webhook1ID', :'package1ID');
insert into event (event_id, package_version, package_id, event_kind_id)
values (:'event1ID', '1.0.0', :'package1ID', 0);
insert into event (event_id, package_version, package_id, event_kind_id)
values (:'event2ID', '1.0.1', :'package1ID', 0);
insert into notification (
    notification_id,
    created_at,
    processed,
    processed_at,
    error,
    event_id,
    webhook_id
) values (
    :'notification1ID',
    '2020-05-29 13:55:00+02',
    true,
    '2020-05-29 13:57:00+02',
    null,
    :'event1ID',
    :'webhook1ID'
);
insert into notification (
    notification_id,
    created_at,
    processed,
    processed_at,
    error,
    event_id,
    webhook_id
) values (
    :'notification2ID',
    '2020-05-29 13:56:00+02',
    true,
    '2020-05-29 13:58:00+02',
    'fake error',
    :'event2ID',
    :'webhook1ID'
);

-- Try to get a webhook owned by a user by other user
select throws_ok(
    $$
        select get_webhook(
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001'
        )
    $$,
    42501,
    'insufficient_privilege',
    'Webhook get should fail because requesting user is not the owner'
);

-- Owner user gets webhook
select is(
    get_webhook(
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001'
    )::jsonb,
    '{
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
        ],
        "last_notifications": [
            {
                "notification_id": "00000000-0000-0000-0000-000000000002",
                "created_at": 1590753360,
                "processed": true,
                "processed_at": 1590753480,
                "error": "fake error"
            },
            {
                "notification_id": "00000000-0000-0000-0000-000000000001",
                "created_at": 1590753300,
                "processed": true,
                "processed_at": 1590753420
            }
        ]
    }'::jsonb,
    'Webhook is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
