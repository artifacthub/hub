-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    :'image1ID',
    0,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package1ID',
    '1.0.0'
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

-- Run some tests
select is(
    get_user_webhooks('00000000-0000-0000-0000-000000000001')::jsonb,
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
                    "kind": 0,
                    "name": "Package 1",
                    "normalized_name": "package-1",
                    "logo_image_id": "00000000-0000-0000-0000-000000000001",
                    "stars": 0,
                    "display_name": null,
                    "description": null,
                    "version": "1.0.0",
                    "app_version": null,
                    "deprecated": null,
                    "signed": null,
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null,
                    "chart_repository": {
                        "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                        "name": "repo1",
                        "display_name": "Repo 1"
                    }
                }
            ],
            "last_notifications": null
        }
    ]'::jsonb,
    'Webhook owned by user1 should be returned'
);
select is(
    get_user_webhooks('00000000-0000-0000-0000-000000000002')::jsonb,
    '[]',
    'No webhooks are expected as user2 owns none'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
