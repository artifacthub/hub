-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set org3ID '00000000-0000-0000-0000-000000000003'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- No organizations at this point
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_organizations('00000000-0000-0000-0000-000000000001', 0, 0)
    $$,
    $$
        values ('[]'::jsonb, 0)
    $$,
    'With no repositories an empty json array is returned'
);

-- Seed some users and organizations
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com', :'image1ID');
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com', :'image2ID');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org3ID', 'org3', 'Organization 3', 'Description 3', 'https://org3.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org2ID', false);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org1ID', true);

-- Users and organizations have just been seeded
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_organizations('00000000-0000-0000-0000-000000000001', 0, 0)
    $$,
    $$
        values (
            '[
                {
                    "name": "org1",
                    "display_name": "Organization 1",
                    "description": "Description 1",
                    "home_url": "https://org1.com",
                    "logo_image_id": "00000000-0000-0000-0000-000000000001",
                    "confirmed": true,
                    "members_count": 2
                },
                {
                    "name": "org2",
                    "display_name": "Organization 2",
                    "description": "Description 2",
                    "home_url": "https://org2.com",
                    "logo_image_id": "00000000-0000-0000-0000-000000000002",
                    "confirmed": false,
                    "members_count": 0
                }
            ]'::jsonb,
            2
        )
    $$,
    'Organizations 1 and 2 are returned as a json array of objects'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_user_organizations('00000000-0000-0000-0000-000000000001', 1, 1)
    $$,
    $$
        values (
            '[
                {
                    "name": "org2",
                    "display_name": "Organization 2",
                    "description": "Description 2",
                    "home_url": "https://org2.com",
                    "logo_image_id": "00000000-0000-0000-0000-000000000002",
                    "confirmed": false,
                    "members_count": 0
                }
            ]'::jsonb,
            2
        )
    $$,
    'Organization 2 is returned when using a limit and offset of 1'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
