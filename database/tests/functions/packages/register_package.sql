-- Start transaction and plan tests
begin;
select plan(15);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');

-- Register package
select register_package('
{
    "kind": 0,
    "name": "package1",
    "logo_url": "logo_url",
    "logo_image_id": "00000000-0000-0000-0000-000000000001",
    "display_name": "Package 1",
    "description": "description",
    "keywords": ["kw1", "kw2"],
    "home_url": "home_url",
    "readme": "readme-version-1.0.0",
    "links": [
        {
            "name": "link1",
            "url": "https://link1"
        },
        {
            "name": "link2",
            "url": "https://link2"
        }
    ],
    "data": {
        "key": "value"
    },
    "version": "1.0.0",
    "app_version": "12.1.0",
    "digest": "digest-package1-1.0.0",
    "deprecated": false,
    "maintainers": [
        {
            "name": "name1",
            "email": "email1"
        },
        {
            "name": "name2",
            "email": "email2"
        }
    ],
    "chart_repository": {
        "chart_repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');

-- Check if package registration succeeded
select results_eq(
    $$
        select
            name,
            latest_version,
            logo_url,
            logo_image_id,
            package_kind_id,
            chart_repository_id
        from package
        where name='package1'
    $$,
    $$
        values (
            'package1',
            '1.0.0',
            'logo_url',
            '00000000-0000-0000-0000-000000000001'::uuid,
            0,
            '00000000-0000-0000-0000-000000000001'::uuid
        )
    $$,
    'Package should exist'
);
select results_eq(
    $$
        select
            s.version,
            s.display_name,
            s.description,
            s.keywords,
            s.home_url,
            s.app_version,
            s.digest,
            s.readme,
            s.links,
            s.data,
            s.deprecated
        from snapshot s
        join package p using (package_id)
        where name='package1'
        and version='1.0.0'
    $$,
    $$
        values (
            '1.0.0',
            'Package 1',
            'description',
            '{kw1,kw2}'::text[],
            'home_url',
            '12.1.0',
            'digest-package1-1.0.0',
            'readme-version-1.0.0',
            '[{"name": "link1", "url": "https://link1"}, {"name": "link2", "url": "https://link2"}]'::jsonb,
            '{"key": "value"}'::jsonb,
            false
        )
    $$,
    'Snapshot should exist'
);
select results_eq(
    $$
        select name, email
        from maintainer m
        where maintainer_id in (
            select maintainer_id
            from package__maintainer pm
            join package p using (package_id)
            where p.name = 'package1'
        )
    $$,
    $$
        values
        ('name1', 'email1'),
        ('name2', 'email2')
    $$,
    'Maintainers should exist'
);
select is_empty(
    $$
        select *
        from event e
        join package p using (package_id)
        where p.name = 'package1'
    $$,
    'No new release event should exist for first version of package1'
);

-- Register a new version of the package previously registered
select register_package('
{
    "kind": 0,
    "name": "package1",
    "logo_url": "logo_url updated",
    "logo_image_id": "00000000-0000-0000-0000-000000000001",
    "display_name": "Package 1 v2",
    "description": "description v2",
    "keywords": ["kw1", "kw2"],
    "home_url": "home_url",
    "readme": "readme-version-2.0.0",
    "version": "2.0.0",
    "app_version": "13.0.0",
    "digest": "digest-package1-2.0.0",
    "deprecated": true,
    "maintainers": [
        {
            "name": "name1",
            "email": "email1"
        }
    ],
    "chart_repository": {
        "chart_repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');

-- Check if package registration succeeded
select results_eq(
    $$
        select logo_url from package where name = 'package1'
    $$,
    $$
        values ('logo_url updated')
    $$,
    'Package logo url should have been updated'
);
select results_eq(
    $$
        select
            s.version,
            s.display_name,
            s.description,
            s.keywords,
            s.home_url,
            s.app_version,
            s.digest,
            s.readme,
            s.links,
            s.deprecated
        from snapshot s
        join package p using (package_id)
        where name='package1'
        and version='2.0.0'
    $$,
    $$
        values (
            '2.0.0',
            'Package 1 v2',
            'description v2',
            '{kw1,kw2}'::text[],
            'home_url',
            '13.0.0',
            'digest-package1-2.0.0',
            'readme-version-2.0.0',
            null::jsonb,
            true
        )
    $$,
    'New snapshot should exist'
);
select results_eq(
    $$
        select name, email
        from maintainer m
        where maintainer_id in (
            select maintainer_id
            from package__maintainer pm
            join package p using (package_id)
            where p.name = 'package1'
        )
    $$,
    $$ values ('name1', 'email1') $$,
    'Package maintainers should have been updated'
);
select is_empty(
    $$
        select *
        from maintainer m
        where maintainer_id not in (
            select maintainer_id from package__maintainer
        )
    $$,
    'Orphan maintainers were deleted'
);
select isnt_empty(
    $$
        select *
        from event e
        join package p using (package_id)
        where p.name = 'package1'
        and e.package_version = '2.0.0'
    $$,
    'New release event should exist for package1 version 2.0.0'
);

-- Register an old version of the package previously registered
select register_package('
{
    "kind": 0,
    "name": "package1",
    "display_name": "Package 1",
    "description": "description",
    "logo_url": "logo_url",
    "home_url": "home_url",
    "logo_image_id": "00000000-0000-0000-0000-000000000001",
    "keywords": ["kw1", "kw2"],
    "readme": "readme-version-0.0.9",
    "version": "0.0.9",
    "app_version": "11.0.0",
    "digest": "digest-package1-0.0.9",
    "deprecated": true,
    "maintainers": [
        {
            "name": "name1",
            "email": "email1"
        },
        {
            "name": "name2",
            "email": "email2"
        }
    ],
    "chart_repository": {
        "chart_repository_id": "00000000-0000-0000-0000-000000000001"
    }
}
');

-- Check if package registration succeeded
select results_eq(
    $$
        select logo_url from package where name = 'package1'
    $$,
    $$
        values ('logo_url updated')
    $$,
    'Package logo url should not have been updated'
);
select results_eq(
    $$
        select
            s.version,
            s.display_name,
            s.description,
            s.keywords,
            s.home_url,
            s.app_version,
            s.digest,
            s.readme,
            s.links,
            s.deprecated
        from snapshot s
        join package p using (package_id)
        where name='package1'
        and version='0.0.9'
    $$,
    $$
        values (
            '0.0.9',
            'Package 1',
            'description',
            '{kw1,kw2}'::text[],
            'home_url',
            '11.0.0',
            'digest-package1-0.0.9',
            'readme-version-0.0.9',
            null::jsonb,
            true
        )
    $$,
    'New snapshot should exist'
);
select results_eq(
    $$
        select name, email
        from maintainer m
        where maintainer_id in (
            select maintainer_id
            from package__maintainer pm
            join package p using (package_id)
            where p.name = 'package1'
        )
    $$,
    $$ values ('name1', 'email1') $$,
    'Package maintainers should not have been updated'
);
select is_empty(
    $$
        select *
        from event e
        join package p using (package_id)
        where p.name = 'package1'
        and e.package_version = '0.0.9'
    $$,
    'No new release event should exist for package1 version 0.0.9'
);

-- Register package that belongs to an organization and check it succeeded
select register_package('
{
    "kind": 1,
    "name": "package3",
    "display_name": "Package 3",
    "description": "description",
    "version": "1.0.0",
    "organization_id": "00000000-0000-0000-0000-000000000001"
}
');
select results_eq(
    $$
        select
            name,
            latest_version,
            package_kind_id,
            organization_id,
            chart_repository_id
        from package
        where name='package3'
    $$,
    $$
        values (
            'package3',
            '1.0.0',
            1,
            '00000000-0000-0000-0000-000000000001'::uuid,
            null::uuid
        )
    $$,
    'Package3 that belongs to organization should exist'
);
select is_empty(
    $$
        select *
        from event e
        join package p using (package_id)
        where p.name = 'package3'
        and e.package_version = '1.0.0'
    $$,
    'No new release event should exist for first version of package3'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
