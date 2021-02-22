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

-- Run some tests before setting the last scanning results for the first time
select is(last_scanning_ts, null, 'Last scanning ts should have not been set yet')
from repository where name = 'repo1';
select is(last_scanning_errors, null, 'Last scanning errors should have not been set yet')
from repository where name = 'repo1';
select is(count(*), 0::bigint, 'No scanning errors events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Set last scanning results and run some more tests
select set_last_scanning_results(:'repo1ID', '', true);
select isnt(last_scanning_ts, null, 'Last scanning ts should have been set')
from repository where name = 'repo1';
select is(last_scanning_errors, null, 'Last scanning errors should have been set to null')
from repository where name = 'repo1';
select is(count(*), 0::bigint, 'No scanning errors events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Set last scanning results again and run some more tests
select set_last_scanning_results(:'repo1ID', 'some errors', true);
select is(last_scanning_errors, 'some errors', 'Last scanning errors should have been set to some errors')
from repository where name = 'repo1';
select is(count(*), 1::bigint, 'One scanning error event should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Set last scanning results again with the same error and run some more tests
select set_last_scanning_results(:'repo1ID', 'some errors', true);
select is(count(*), 1::bigint, 'No more scanning error events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Set last scanning results again with another error and run some more tests
select set_last_scanning_results(:'repo1ID', 'some new errors', true);
select is(last_scanning_errors, 'some new errors', 'Last scanning errors should have been set to some new errors')
from repository where name = 'repo1';
select is(count(*), 2::bigint, 'One more scanning error event should have been registered (total 2 now)')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Set last scanning results again with no errors and run some more tests
select set_last_scanning_results(:'repo1ID', '', true);
select is(last_scanning_errors, null, 'Last scanning errors should have been set to null')
from repository where name = 'repo1';
select is(count(*), 2::bigint, 'No more scanning error events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Set last scanning results again with another error and run some more tests
select set_last_scanning_results(:'repo1ID', 'some new errors', false);
select is(last_scanning_errors, 'some new errors', 'Last scanning errors should have been set to some new errors')
from repository where name = 'repo1';
select is(count(*), 2::bigint, 'No more scanning error events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 4;

-- Finish tests and rollback transaction
select * from finish();
rollback;
