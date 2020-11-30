-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set event1ID '00000000-0000-0000-0000-000000000001'

-- No pending events available yet
select is_empty(
    $$ select get_pending_event()::jsonb $$,
    'Should not return an event'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (package_id, name, latest_version, repository_id)
values (:'package1ID', 'Package 1', '1.0.0', :'repo1ID');
insert into event (event_id, package_version, package_id, event_kind_id, data)
values (:'event1ID', '1.0.0', :'package1ID', 0, '{"k": "v"}');
savepoint before_getting_event;

-- Run some tests
select is(
    get_pending_event()::jsonb,
    '{
        "event_id": "00000000-0000-0000-0000-000000000001",
        "event_kind": 0,
        "package_id": "00000000-0000-0000-0000-000000000001",
        "package_version": "1.0.0",
        "data": {"k": "v"}
    }'::jsonb,
    'An event should be returned'
);
select results_eq(
    $$
        select processed from event
        where event_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (true)
    $$,
    'Event should be marked as processed'
);
rollback to before_getting_event;
select results_eq(
    $$
        select processed from event
        where event_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$
        values (false)
    $$,
    'Event should not be marked as processed as transaction was rolled back'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
