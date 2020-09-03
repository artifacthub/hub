-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');

-- Run some tests before setting the verified publisher flag for the first time
select is(verified_publisher, false, 'Verified publisher should be false initially')
from repository where name = 'repo1';

-- Set verified publisher and run some more tests
select set_verified_publisher(:'repo1ID', true);
select is(verified_publisher, true, 'Verified publisher should be now true')
from repository where name = 'repo1';

-- Finish tests and rollback transaction
select * from finish();
rollback;
