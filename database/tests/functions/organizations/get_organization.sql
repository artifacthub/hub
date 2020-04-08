-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'

-- Seed some users and organizations
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com', :'image1ID');

-- Run some tests
select is(
    get_organization('org1')::jsonb, '
    {
        "name": "org1",
        "display_name": "Organization 1",
        "description": "Description 1",
        "home_url": "https://org1.com",
        "logo_image_id": "00000000-0000-0000-0000-000000000001"
    }
    '::jsonb,
    'Organization1 should exist'
);
select is_empty(
    $$ select get_organization('org2')::jsonb $$,
    'Organization2 should not exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
