-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set notification1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- No pending notifications available yet
select is_empty(
    $$ select get_pending_notification()::jsonb $$,
    'Should not return a notification'
);

-- Seed some data
insert into package (
    package_id,
    name,
    latest_version,
    package_kind_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    1
);
insert into notification (notification_id, package_version, package_id, notification_kind_id)
values (:'notification1ID', '1.0.0', :'package1ID', 0);
savepoint before_getting_notification;

-- Run some tests
select is(
    get_pending_notification()::jsonb,
    '{
        "notification_id": "00000000-0000-0000-0000-000000000001",
        "package_version": "1.0.0",
        "package_id": "00000000-0000-0000-0000-000000000001",
        "notification_kind": 0
    }'::jsonb,
    'Notification should be returned'
);
select results_eq(
    $$
        select processed from notification
        where notification_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (true)
    $$,
    'Notification should be marked as processed'
);
rollback to before_getting_notification;
select results_eq(
    $$
        select processed from notification
        where notification_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (false)
    $$,
    'Notification should not be marked as processed as transaction was rolled back'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
