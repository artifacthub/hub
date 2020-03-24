-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set org3ID '00000000-0000-0000-0000-000000000003'

-- No organizations at this point
select is(
    get_user_organizations(:'user1ID')::jsonb,
    '[]'::jsonb,
    'With no organizations an empty json array is returned'
);

-- Seed one user and some organizations
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into "user" (user_id, alias, email) values (:'user2ID', 'user2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org3ID', 'org3', 'Organization 3', 'Description 3', 'https://org3.com');
insert into user__organization values(:'user1ID', :'org1ID');
insert into user__organization values(:'user1ID', :'org2ID');
insert into user__organization values(:'user2ID', :'org1ID');

select * from user__organization where organization_id = organization_id;

-- User and some organizations have just been seeded
select is(
    get_user_organizations(:'user1ID')::jsonb,
    '[{
        "name": "org1",
        "display_name": "Organization 1",
        "description": "Description 1",
        "home_url": "https://org1.com",
        "members_count": 2
    }, {
        "name": "org2",
        "display_name": "Organization 2",
        "description": "Description 2",
        "home_url": "https://org2.com",
        "members_count": 1
    }]'::jsonb,
    'Organizations are returned as a json array of objects'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
