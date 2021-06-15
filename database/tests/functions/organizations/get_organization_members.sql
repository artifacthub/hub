-- Start transaction and plan tests
begin;
select plan(4);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set user2ID '00000000-0000-0000-0000-000000000002'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'

-- Seed some users and organizations
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user1ID', 'user1', 'firstname1', 'lastname1', 'user1@email.com');
insert into "user" (user_id, alias, first_name, last_name, email)
values (:'user2ID', 'user2', 'firstname2', 'lastname2', 'user2@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com');
insert into user__organization (user_id, organization_id, confirmed) values(:'user1ID', :'org1ID', true);
insert into user__organization (user_id, organization_id, confirmed) values(:'user2ID', :'org1ID', false);

-- Users and organizations have just been seeded
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_organization_members('00000000-0000-0000-0000-000000000001', 'org1', 0, 0)
    $$,
    $$
        values (
            '[
                {
                    "alias": "user1",
                    "first_name": "firstname1",
                    "last_name": "lastname1",
                    "confirmed": true
                },
                {
                    "alias": "user2",
                    "first_name": "firstname2",
                    "last_name": "lastname2",
                    "confirmed": false
                }
            ]'::jsonb,
            2
        )
    $$,
    'No limit or offset used, members user1 and user2 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_organization_members('00000000-0000-0000-0000-000000000001', 'org1', 1, 1)
    $$,
    $$
        values (
            '[
                {
                    "alias": "user2",
                    "first_name": "firstname2",
                    "last_name": "lastname2",
                    "confirmed": false
                }
            ]'::jsonb,
            2
        )
    $$,
    'Limit and offset of 1 used, member user2 returned'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer
        from get_organization_members('00000000-0000-0000-0000-000000000001', 'org1', 0, 2)
    $$,
    $$
        values ('[]'::jsonb, 2)
    $$,
    'No members expected when using an offset of 2'
);
select throws_ok(
    $$ select * from get_organization_members('00000000-0000-0000-0000-000000000001', 'org2', 0, 0) $$,
    42501,
    'insufficient_privilege',
    'User1 should not be able to get organization2 members'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
