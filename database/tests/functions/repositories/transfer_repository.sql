-- Start transaction and plan tests
begin;
select plan(16);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set org3ID '00000000-0000-0000-0000-000000000003'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org3ID', 'org3', 'Organization 3', 'Description 3', 'https://org3.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org3ID', true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    display_name,
    description
) values (
    :'package1ID',
    '1.0.0',
    '12.0.0',
    'Package 1',
    'description'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    display_name,
    description
) values (
    :'package2ID',
    '1.0.0',
    '12.0.0',
    'Package 2',
    'description'
);

-- Transfers NOT part of an ownership claim request

-- Try to transfer repository owned by a user to other user
select throws_ok(
    $$
        select transfer_repository(
            'repo1',
            '00000000-0000-0000-0000-000000000002',
            null,
            false
        )
    $$,
    42501,
    'insufficient_privilege',
    'Repository transfer should fail because requesting user is not the owner'
);

-- Try to transfer repository owned by organization to user not belonging to it
select throws_ok(
    $$
        select transfer_repository(
            'repo2',
            '00000000-0000-0000-0000-000000000002',
            null,
            false
        )
    $$,
    42501,
    'insufficient_privilege',
    'Repository transfer should fail because requesting user does not belong to owning organization'
);

-- Try to transfer repository owned by a user to an organization the user does
-- not belong to
select throws_ok(
    $$
        select transfer_repository(
            'repo1',
            '00000000-0000-0000-0000-000000000001',
            'org2',
            false
        )
    $$,
    42501,
    'insufficient_privilege',
    'Repository transfer should fail because requesting user does not belong to dst org'
);

-- Transfer org owned repository to user
select transfer_repository(
    'repo2',
    '00000000-0000-0000-0000-000000000001',
    null,
    false
);
select results_eq(
    $$
        select user_id, organization_id
        from repository
        where name = 'repo2'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000001'::uuid, null::uuid)
    $$,
    'Repository should have been transferred to user1'
);
select is(count(*), 0::bigint, 'No repository ownership claim events should have been registered')
from event where repository_id=:'repo2ID' and event_kind_id = 3;
select is(
    tsdoc,
    '2:3B 2:7B description:4B package:2B package2:1A repo:6B repo2:5B user1:8B'::tsvector,
    'Package 2 tsdoc should have been updated (user1 is now the publisher)'
)
from package where package_id=:'package2ID';
select is(
    tsdoc,
    null,
    'Package 1 tsdoc should not have been updated'
)
from package where package_id=:'package1ID';
select transfer_repository(
    'repo2',
    '00000000-0000-0000-0000-000000000001',
    'org1',
    false
);
select is(
    tsdoc,
    '1:10B 2:3B,7B description:4B org1:8B organization:9B package:2B package2:1A repo:6B repo2:5B'::tsvector,
    'Package 2 tsdoc should have been updated again (org1 is now the publisher)'
)
from package where package_id=:'package2ID';

-- Transfer org owned repository to other org
select transfer_repository(
    'repo2',
    '00000000-0000-0000-0000-000000000001',
    'org3',
    false
);
select results_eq(
    $$
        select user_id, organization_id
        from repository
        where name = 'repo2'
    $$,
    $$
        values (null::uuid, '00000000-0000-0000-0000-000000000003'::uuid)
    $$,
    'Repository should have been transferred to org3'
);
select is(count(*), 0::bigint, 'No repository ownership claim events should have been registered')
from event where repository_id=:'repo2ID' and event_kind_id = 3;

-- Transfer user owned repository to org
select transfer_repository(
    'repo1',
    '00000000-0000-0000-0000-000000000001',
    'org1',
    false
);
select results_eq(
    $$
        select user_id, organization_id
        from repository
        where name = 'repo1'
    $$,
    $$
        values (null::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    $$,
    'Repository should have been transferred to org1'
);
select is(count(*), 0::bigint, 'No repository ownership claim events should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 3;

-- Transfers part of an ownership claim request

-- Transfer repository owned by organization to user not belonging to it
select transfer_repository(
    'repo1',
    '00000000-0000-0000-0000-000000000002',
    null,
    true
);
select results_eq(
    $$
        select user_id, organization_id
        from repository
        where name = 'repo1'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000002'::uuid, null::uuid)
    $$,
    'Repository should have been transferred to user2'
);
select results_eq(
    $$
        select data
        from event
        where repository_id = '00000000-0000-0000-0000-000000000001'
        and event_kind_id = 3
    $$,
    $$
        values ('{
            "subscriptors": [{"user_id": "00000000-0000-0000-0000-000000000001"}]
        }'::jsonb)
    $$,
    'Repository ownership claim event should have been registered'
);

-- Transfer repository owned by a user to other user
select transfer_repository(
    'repo1',
    '00000000-0000-0000-0000-000000000001',
    null,
    true
);
select results_eq(
    $$
        select user_id, organization_id
        from repository
        where name = 'repo1'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000001'::uuid, null::uuid)
    $$,
    'Repository should have been transferred to user1'
);
select is(count(*), 2::bigint, 'Another repository ownership claim event should have been registered')
from event where repository_id=:'repo1ID' and event_kind_id = 3;

-- Finish tests and rollback transaction
select * from finish();
rollback;
