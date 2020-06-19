-- Start transaction and plan tests
begin;
select plan(6);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set webhook1ID '00000000-0000-0000-0000-000000000001'
\set webhook2ID '00000000-0000-0000-0000-000000000002'

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
insert into package (package_id, name, latest_version, repository_id)
values (:'package2ID', 'Package 2', '1.0.0', :'repo1ID');
insert into webhook (webhook_id, name, url, user_id)
values (:'webhook1ID', 'webhook1', 'http://webhook1.url', :'user1ID');
insert into webhook__event_kind (webhook_id, event_kind_id) values (:'webhook1ID', 0);
insert into webhook__package (webhook_id, package_id) values (:'webhook1ID', :'package1ID');
insert into webhook (webhook_id, name, url, organization_id)
values (:'webhook2ID', 'webhook2', 'http://webhook2.url', :'org1ID');

-- Try to update a webhook owned by a user by other user
select throws_ok(
    $$
        select update_webhook('00000000-0000-0000-0000-000000000002', '
        {
            "webhook_id": "00000000-0000-0000-0000-000000000001",
            "name": "webhook1 updated",
            "url": "http://webhook1.url"
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'Webhook update should fail because requesting user is not the owner'
);

-- Try to update webhook owned by organization by user not belonging to it
select throws_ok(
    $$
        select update_webhook('00000000-0000-0000-0000-000000000002', '
        {
            "webhook_id": "00000000-0000-0000-0000-000000000002",
            "name": "webhook2 updated",
            "url": "http://webhook2.url"
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'Webhook update should fail because requesting user does not belong to owning organization'
);

-- Update webhook owned by user
select update_webhook('00000000-0000-0000-0000-000000000001', '
{
    "webhook_id": "00000000-0000-0000-0000-000000000001",
    "name": "webhook1 updated",
    "description": "description updated",
    "url": "http://webhook1.url/updated",
    "secret": "very updated",
    "content_type": "text/xml",
    "template": "custom payload updated",
    "active": false,
    "event_kinds": [1],
    "packages": [
        {
            "package_id": "00000000-0000-0000-0000-000000000002"
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
        where webhook_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (
            'webhook1 updated',
            'description updated',
            'http://webhook1.url/updated',
            'very updated',
            'text/xml',
            'custom payload updated',
            false,
            '00000000-0000-0000-0000-000000000001'::uuid,
            null::uuid
        )
    $$,
    'Webhook1 owned by user1 should have been updated'
);
select results_eq(
    $$
        select event_kind_id
        from webhook__event_kind wek
        join webhook w using (webhook_id)
        where w.webhook_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (1)
    $$,
    'Webhook1 should now be linked to security alert event'
);
select results_eq(
    $$
        select package_id
        from webhook__package wp
        join webhook w using (webhook_id)
        where w.webhook_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000002'::uuid)
    $$,
    'Webhook1 should now be linked to package2'
);

-- Update webhook owned by organization (requesting user belongs to organization)
select update_webhook('00000000-0000-0000-0000-000000000001', '
{
    "webhook_id": "00000000-0000-0000-0000-000000000002",
    "name": "webhook2 updated",
    "url": "http://webhook2.url/updated",
    "active": false
}
'::jsonb);
select results_eq(
    $$
        select name, url, active
        from webhook
        where webhook_id = '00000000-0000-0000-0000-000000000002'
    $$,
    $$
        values (
            'webhook2 updated',
            'http://webhook2.url/updated',
            false
        )
    $$,
    'Webhook2 owned by org1 should have been updated'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
