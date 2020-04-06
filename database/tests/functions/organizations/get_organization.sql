-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- Seed some users and organizations
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com', :'image1ID');
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com', :'image2ID');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org2ID', false);

-- Users and organizations have just been seeded
select is(
    get_organization(:'user1ID', 'org1')::jsonb, '
    {
        "name": "org1",
        "display_name": "Organization 1",
        "description": "Description 1",
        "home_url": "https://org1.com",
        "logo_image_id": "00000000-0000-0000-0000-000000000001"
    }
    '::jsonb,
    'Organization1 should exist and user1 should be able to get it'
);
select is_empty(
    $$ select get_organization('00000000-0000-0000-0000-000000000002', 'org1')::jsonb $$,
    'Organization1 exists but user2 should not be able to get it'
);
select is_empty(
    $$ select get_organization('00000000-0000-0000-0000-000000000002', 'org2')::jsonb $$,
    'Organization2 exists but user2 should not be able to get he did not confirm his membership'
);


-- Finish tests and rollback transaction
select * from finish();
rollback;
