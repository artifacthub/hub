-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'


-- No repositories at this point
select is(
    get_repositories_by_kind(0, false)::jsonb,
    '[]'::jsonb,
    'With no repositories an empty json array is returned'
);

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', 1, :'user1ID');

-- Run some tests
select is(
    get_repositories_by_kind(0, false)::jsonb,
    '[{
        "repository_id": "00000000-0000-0000-0000-000000000001",
        "name": "repo1",
        "display_name": "Repo 1",
        "url": "https://repo1.com",
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "digest": null,
        "last_tracking_ts": null,
        "last_tracking_errors": null,
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null
    }, {
        "repository_id": "00000000-0000-0000-0000-000000000002",
        "name": "repo2",
        "display_name": "Repo 2",
        "url": "https://repo2.com",
        "kind": 0,
        "verified_publisher": false,
        "official": false,
        "digest": null,
        "last_tracking_ts": null,
        "last_tracking_errors": null,
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null
    }]'::jsonb,
    'Repositories 1 and 2 are returned'
);
select is(
    get_repositories_by_kind(1, false)::jsonb,
    '[{
        "repository_id": "00000000-0000-0000-0000-000000000003",
        "name": "repo3",
        "display_name": "Repo 3",
        "url": "https://repo3.com",
        "kind": 1,
        "verified_publisher": false,
        "official": false,
        "digest": null,
        "last_tracking_ts": null,
        "last_tracking_errors": null,
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null
    }]'::jsonb,
    'Repository 3 is returned'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
