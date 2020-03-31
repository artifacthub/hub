-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'

-- Seed user and organization
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user1ID', 'user1', 'firstname1', 'lastname1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into user__organization (user_id, organization_id) values(:'user1ID', :'org1ID');

-- User and organization have been seeded
select results_eq(
    $$
        select confirmed
        from user__organization
        where user_id = '00000000-0000-0000-0000-000000000001'
        and organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$ values (false) $$,
    'User1 membership in organization1 should not be confirmed'
);
select throws_ok(
    $$
        select confirm_organization_membership(
            '00000000-0000-0000-0000-000000000002',
            'org1'
        )
    $$,
    'organization membership confirmation failed',
    'User has not been invited to join organization, confirmation should fail'
);
select throws_ok(
    $$
        select confirm_organization_membership(
            '00000000-0000-0000-0000-000000000001',
            'org9'
        )
    $$,
    'organization membership confirmation failed',
    'Organization does not exist, confirmation should fail'
);

-- Confirm organization membership and check it succeeded
select confirm_organization_membership(:'user1ID'::uuid, 'org1'::text);
select results_eq(
    $$
        select confirmed
        from user__organization
        where user_id = '00000000-0000-0000-0000-000000000001'
        and organization_id = '00000000-0000-0000-0000-000000000001'
    $$,
    $$ values (true) $$,
    'User1 membership in organization1 should have been confirmed'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
