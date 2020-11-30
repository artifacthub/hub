-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set webhook1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set event1ID '00000000-0000-0000-0000-000000000001'
\set notification1ID '00000000-0000-0000-0000-000000000001'
\set notification2ID '00000000-0000-0000-0000-000000000002'

-- No pending events available yet
select is_empty(
    $$ select get_pending_notification()::jsonb $$,
    'Should not return a notification'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into webhook (
    webhook_id,
    name,
    url,
    secret,
    content_type,
    template,
    active,
    user_id
) values (
    :'webhook1ID',
    'webhook1',
    'http://webhook1.url',
    'very',
    'application/json',
    'custom payload',
    true,
    :'user1ID'
);
insert into event (event_id, package_version, package_id, event_kind_id)
values (:'event1ID', '1.0.0', :'package1ID', 0);

-- Add notification for user1 and check we get it successfully
insert into notification (notification_id, event_id, user_id)
values (:'notification1ID', :'event1ID', :'user1ID');
select is(
    get_pending_notification()::jsonb,
    '{
        "notification_id": "00000000-0000-0000-0000-000000000001",
        "event": {
            "event_id": "00000000-0000-0000-0000-000000000001",
            "event_kind": 0,
            "package_id": "00000000-0000-0000-0000-000000000001",
            "package_version": "1.0.0"
        },
        "user": {
            "email": "user1@email.com"
        }
	}'::jsonb,
    'A notification for user1 should be returned'
);
update notification set processed=true where notification_id=:'notification1ID';

-- Add notification for webhook1 and check we get it successfully
insert into notification (notification_id, event_id, webhook_id)
values (:'notification2ID', :'event1ID', :'webhook1ID');
select is(
    get_pending_notification()::jsonb,
    '{
        "notification_id": "00000000-0000-0000-0000-000000000002",
        "event": {
            "event_id": "00000000-0000-0000-0000-000000000001",
            "event_kind": 0,
            "package_id": "00000000-0000-0000-0000-000000000001",
            "package_version": "1.0.0"
        },
        "webhook": {
            "name": "webhook1",
            "url": "http://webhook1.url",
            "secret": "very",
            "content_type": "application/json",
            "template": "custom payload"
        }
	}'::jsonb,
    'A notification for webhook1 should be returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
