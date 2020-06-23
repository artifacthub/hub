-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set event1ID '00000000-0000-0000-0000-000000000001'
\set notification1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into event (event_id, package_version, package_id, event_kind_id)
values (:'event1ID', '1.0.0', :'package1ID', 0);
insert into notification (notification_id, event_id, user_id)
values (:'notification1ID', :'event1ID', :'user1ID');

-- Run some tests
select results_eq(
    $$
        select processed, processed_at, error from notification
        where notification_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (false, null::timestamptz, null::text)
    $$,
    'Notification has not been processed yet'
);

-- Update notification status
select update_notification_status(:'notification1ID', true, 'fake error');

-- Run some tests
select results_eq(
    $$
        select processed, error from notification
        where notification_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (true, 'fake error')
    $$,
    'Notification has been processed'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
