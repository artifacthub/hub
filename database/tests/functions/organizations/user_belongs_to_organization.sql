-- Start transaction and plan tests
begin;
select plan(5);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed one user and some organizations
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into user__organization (user_id, organization_id) values(:'user1ID', :'org1ID');

-- User and some organizations have just been seeded
select is(
    user_belongs_to_organization(:'user1ID', 'org1'),
    false,
    'User1 does not belong to Org1 as it is not confirmed yet'
);

-- Confirm user membership to organization
update "user__organization" set confirmed = true
where user_id = :'user1ID' and organization_id = :'org1ID';
select is(
    user_belongs_to_organization(:'user1ID', 'org1'),
    true,
    'User1 belongs to Org1'
);
select is(
    user_belongs_to_organization(:'user1ID', 'org2'),
    false,
    'User1 does not belong to Org2'
);
select is(
    user_belongs_to_organization('00000000-0000-0000-0000-000000000009', 'org1'),
    false,
    'Non existing user does not belong to Org1'
);
select is(
    user_belongs_to_organization(:'user1ID', 'org9'),
    false,
    'User1 does not belong to non existing org'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
