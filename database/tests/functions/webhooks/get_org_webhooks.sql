-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
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
    organization_id
) values (
    :'webhook1ID',
    'webhook1',
    'description',
    'http://webhook1.url',
    'very',
    'application/json',
    'custom payload',
    true,
    :'org1ID'
);
insert into webhook__event_kind (webhook_id, event_kind_id) values (:'webhook1ID', 0);
insert into webhook__package (webhook_id, package_id) values (:'webhook1ID', :'package1ID');

-- Run some tests
select is(
    get_org_webhooks('00000000-0000-0000-0000-000000000001', 'org1')::jsonb,
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
                        "user_alias": "user1"
                    }
                }
            ]
        }
    ]'::jsonb,
    'Webhook owned by org1 should be returned as user1 belongs to it'
);
select is(
    get_org_webhooks('00000000-0000-0000-0000-000000000002', 'org1')::jsonb,
    '[]',
    'No webhooks are expected as user2 does not belong to the owning org'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
