-- Start transaction and plan tests
begin;
select plan(5);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');

-- Add webhook owned by user
select add_webhook(:'user1ID', null, '
{
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
            "package_id": "00000000-0000-0000-0000-000000000001"
        }
    ]
}
'::jsonb);
select results_eq(
    $$
        select
            name,
            description,
            url,
            secret,
            content_type,
            template,
            active,
            user_id,
            organization_id
        from webhook
        where name = 'webhook1'
    $$,
    $$
        values (
            'webhook1',
            'description',
            'http://webhook1.url',
            'very',
            'application/json',
            'custom payload',
            true,
            '00000000-0000-0000-0000-000000000001'::uuid,
            null::uuid
        )
    $$,
    'Webhook1 owned by user1 should exist'
);
select results_eq(
    $$
        select event_kind_id
        from webhook__event_kind wek
        join webhook w using (webhook_id)
        where w.name = 'webhook1'
    $$,
    $$
        values (0)
    $$,
    'Webhook1 should be linked to new release event'
);
select results_eq(
    $$
        select package_id
        from webhook__package wp
        join webhook w using (webhook_id)
        where w.name = 'webhook1'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000001'::uuid)
    $$,
    'Webhook1 should be linked to package1'
);

-- When an owning user and organization are provided, the organization takes precedence
select add_webhook(:'user1ID', 'org1', '
{
    "name": "webhook2",
    "url": "http://webhook2.url",
    "active": false
}
'::jsonb);
select results_eq(
    $$
        select
            name,
            url,
            active,
            user_id,
            organization_id
        from webhook
        where name = 'webhook2'
    $$,
    $$
        values (
            'webhook2',
            'http://webhook2.url',
            false,
            null::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Webhook2 owned by org1 should exist'
);

-- Add webhook owned by organization, but user does not belong to it
select throws_ok(
    $$
        select add_webhook('00000000-0000-0000-0000-000000000009', 'org1', '
        {
            "name": "webhook3",
            "url": "http://webhook3.url",
            "active": false
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'User not belonging to organization should not be able to webhooks in its name'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
