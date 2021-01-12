-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'

-- Seed user and organization
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);

-- Update organization
select update_organization(:'user1ID', 'org1', '
{
    "name": "org1-updated",
    "display_name": "Organization 1 updated",
    "description": "Description 1 updated",
    "home_url": "https://org1.com/updated",
    "logo_image_id": "00000000-0000-0000-0000-000000000001"
}
'::jsonb);

-- Check if organization was updated successfully
select results_eq(
    $$
        select
            name,
            display_name,
            description,
            home_url,
            logo_image_id
        from organization
    $$,
    $$
        values (
            'org1-updated',
            'Organization 1 updated',
            'Description 1 updated',
            'https://org1.com/updated',
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Organization should have been updated'
);

-- Try again using a user not belonging to the organization
select throws_ok(
    $$
        select update_organization('00000000-0000-0000-0000-000000000002', 'org1-updated', '
        {
            "name": "org1",
            "display_name": "Organization 1",
            "description": "Description 1",
            "home_url": "https://org1.com"
        }
        '::jsonb)
    $$,
    42501,
    'insufficient_privilege',
    'User2 should not be able to update organization'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
