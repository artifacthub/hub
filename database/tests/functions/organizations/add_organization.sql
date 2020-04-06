-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed user
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');

-- Add organization
select add_organization(:'user1ID', '
{
    "name": "org1",
    "display_name": "Organization 1",
    "description": "Description 1",
    "home_url": "https://org1.com",
    "logo_image_id": "00000000-0000-0000-0000-000000000001"
}
'::jsonb);

-- Check if organization was added successfully
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
            'org1',
            'Organization 1',
            'Description 1',
            'https://org1.com',
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Organization should exist'
);
select results_eq(
    $$
        select uo.user_id
        from user__organization uo
        join organization o using (organization_id)
        where o.name = 'org1'
    $$,
    $$
        values ('00000000-0000-0000-0000-000000000001'::uuid)
    $$,
    'User who created the organization should have joined it'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
