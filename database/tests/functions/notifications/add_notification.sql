-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set event1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into event (event_id, package_version, package_id, event_kind_id)
values (:'event1ID', '1.0.0', :'package1ID', 0);
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

-- Run some tests
select add_notification('
{
    "event": {
        "event_id": "00000000-0000-0000-0000-000000000001"
    },
    "user": {
        "user_id": "00000000-0000-0000-0000-000000000001"
    }
}
'::jsonb);
select results_eq(
    $$
        select event_id, user_id, webhook_id
        from notification
        where event_id = '00000000-0000-0000-0000-000000000001'
        and user_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            null::uuid
        )
    $$,
    'Notification for event1 and user1 should exist'
);
select add_notification('
{
    "event": {
        "event_id": "00000000-0000-0000-0000-000000000001"
    },
    "webhook": {
        "webhook_id": "00000000-0000-0000-0000-000000000001"
    }
}
'::jsonb);
select results_eq(
    $$
        select event_id, user_id, webhook_id
        from notification
        where event_id = '00000000-0000-0000-0000-000000000001'
        and webhook_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (
            '00000000-0000-0000-0000-000000000001'::uuid,
            null::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Notification for event1 and webhook1 should exist'
);
select throws_ok(
    $$
        select add_notification('
        {
            "event": {
                "event_id": "00000000-0000-0000-0000-000000000001"
            },
            "user": {
                "user_id": "00000000-0000-0000-0000-000000000001"
            },
            "webhook": {
                "webhook_id": "00000000-0000-0000-0000-000000000001"
            }
        }
        '::jsonb)
    $$,
    23514,
    'new row for relation "notification" violates check constraint "notification_check"',
    'Both user and webhook were provided, add should fail'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
