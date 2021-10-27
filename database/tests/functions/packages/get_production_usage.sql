-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set org3ID '00000000-0000-0000-0000-000000000003'
\set org4ID '00000000-0000-0000-0000-000000000004'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some users and organizations
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com', :'image1ID');
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com', :'image2ID');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org3ID', 'org3', 'Organization 3', 'Description 3', 'https://org3.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org4ID', 'org4', 'Organization 4', 'Description 4', 'https://org4.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org2ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org3ID', false);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org4ID', true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'pkg1',
    '1.0.0',
    :'repo1ID'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'pkg2',
    '1.0.0',
    :'repo1ID'
);
insert into production_usage (package_id, organization_id) values(:'package1ID', :'org1ID');
insert into production_usage (package_id, organization_id) values(:'package1ID', :'org3ID');

-- Run some tests
select is(
    get_production_usage('00000000-0000-0000-0000-000000000001', 'repo1', 'pkg2')::jsonb,
    '[
        {
            "name": "org1",
            "display_name": "Organization 1",
            "home_url": "https://org1.com",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "used_in_production": false
        },
        {
            "name": "org2",
            "display_name": "Organization 2",
            "home_url": "https://org2.com",
            "logo_image_id": "00000000-0000-0000-0000-000000000002",
            "used_in_production": false
        }
    ]'::jsonb,
    'No organizations user1 belongs to are using pkg2 in production'
);
select is(
    get_production_usage('00000000-0000-0000-0000-000000000002', 'repo1', 'pkg1')::jsonb,
    '[
        {
            "name": "org4",
            "display_name": "Organization 4",
            "home_url": "https://org4.com",
            "used_in_production": false
        }
    ]'::jsonb,
    'No organizations user2 belongs to are using pkg1 in production'
);
select is(
    get_production_usage('00000000-0000-0000-0000-000000000001', 'repo1', 'pkg1')::jsonb,
    '[
        {
            "name": "org1",
            "display_name": "Organization 1",
            "home_url": "https://org1.com",
            "logo_image_id": "00000000-0000-0000-0000-000000000001",
            "used_in_production": true
        },
        {
            "name": "org2",
            "display_name": "Organization 2",
            "home_url": "https://org2.com",
            "logo_image_id": "00000000-0000-0000-0000-000000000002",
            "used_in_production": false
        }
    ]'::jsonb,
    'Org1 is using pkg1 in production, but org2 is not'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
