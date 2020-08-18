-- Start transaction and plan tests
begin;
select plan(15);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');

-- Run some tests before setting the last tracking results for the first time
select is(last_tracking_ts, null, 'Last tracking ts should have not been set yet')
from repository where name = 'repo1';
select is(last_tracking_errors, null, 'Last tracking errors should have not been set yet')
from repository where name = 'repo1';
select is(count(*), 0::bigint, 'No tracking errors events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Set last tracking results and run some more tests
select set_last_tracking_results(:'repo1ID', '', true);
select isnt(last_tracking_ts, null, 'Last tracking ts should have been set')
from repository where name = 'repo1';
select is(last_tracking_errors, null, 'Last tracking errors should have been set to null')
from repository where name = 'repo1';
select is(count(*), 0::bigint, 'No tracking errors events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Set last tracking results again and run some more tests
select set_last_tracking_results(:'repo1ID', 'some errors', true);
select is(last_tracking_errors, 'some errors', 'Last tracking errors should have been set to some errors')
from repository where name = 'repo1';
select is(count(*), 1::bigint, 'One tracking error event should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Set last tracking results again with the same error and run some more tests
select set_last_tracking_results(:'repo1ID', 'some errors', true);
select is(count(*), 1::bigint, 'No more tracking error events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Set last tracking results again with another error and run some more tests
select set_last_tracking_results(:'repo1ID', 'some new errors', true);
select is(last_tracking_errors, 'some new errors', 'Last tracking errors should have been set to some new errors')
from repository where name = 'repo1';
select is(count(*), 2::bigint, 'One more tracking error event should have been registered (total 2 now)')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Set last tracking results again with no errors and run some more tests
select set_last_tracking_results(:'repo1ID', '', true);
select is(last_tracking_errors, null, 'Last tracking errors should have been set to null')
from repository where name = 'repo1';
select is(count(*), 2::bigint, 'No more tracking error events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Set last tracking results again with another error and run some more tests
select set_last_tracking_results(:'repo1ID', 'some new errors', false);
select is(last_tracking_errors, 'some new errors', 'Last tracking errors should have been set to some new errors')
from repository where name = 'repo1';
select is(count(*), 2::bigint, 'No more tracking error events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 2;

-- Finish tests and rollback transaction
select * from finish();
rollback;
