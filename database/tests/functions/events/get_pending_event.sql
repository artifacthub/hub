-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set event1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- No pending events available yet
select is_empty(
    $$ select get_pending_event()::jsonb $$,
    'Should not return an event'
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
insert into event (event_id, package_version, package_id, event_kind_id)
values (:'event1ID', '1.0.0', :'package1ID', 0);
savepoint before_getting_event;

-- Run some tests
select is(
    get_pending_event()::jsonb,
    '{
        "event_id": "00000000-0000-0000-0000-000000000001",
        "event_kind": 0,
        "package_version": "1.0.0",
        "package_id": "00000000-0000-0000-0000-000000000001"
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
