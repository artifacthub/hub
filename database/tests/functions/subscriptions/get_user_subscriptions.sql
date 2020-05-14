-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email)
values (:'user2ID', 'user2', 'user2@email.com');
insert into chart_repository (chart_repository_id, name, display_name, url, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    :'image1ID',
    0,
    :'repo1ID'
);
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    package_kind_id,
    organization_id
) values (
    :'package2ID',
    'Package 2',
    '1.0.0',
    :'image2ID',
    1,
    :'org1ID'
);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 0);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 1);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package2ID', 0);

-- Run some tests
select is(
    get_user_subscriptions(:'user1ID')::jsonb,
    '[{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "user_alias": "user1",
        "organization_name": null,
        "organization_display_name": null,
        "chart_repository": {
            "name": "repo1",
            "display_name": "Repo 1"
        },
        "event_kinds": [0, 1]
    }, {
        "package_id": "00000000-0000-0000-0000-000000000002",
        "kind": 1,
        "name": "Package 2",
        "normalized_name": "package-2",
        "logo_image_id": "00000000-0000-0000-0000-000000000002",
        "user_alias": null,
        "organization_name": "org1",
        "organization_display_name": "Organization 1",
        "chart_repository": null,
        "event_kinds": [0]
    }]'::jsonb,
    'Two subscriptions should be returned'
);
select is(
    get_user_subscriptions(:'user2ID')::jsonb,
    '[]',
    'No subscriptions expected for user2'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
