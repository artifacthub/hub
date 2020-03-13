-- Start transaction and plan tests
begin;
select plan(10);

-- Declare some variables
\set repo1ID '00000000-0000-0000-0000-000000000001'

-- Seed one chart repository
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');

-- Register package
select register_package('
{
    "kind": 0,
    "name": "package1",
    "display_name": "Package 1",
    "description": "description",
    "home_url": "home_url",
    "logo_url": "logo_url",
    "logo_image_id": "00000000-0000-0000-0000-000000000001",
    "keywords": ["kw1", "kw2"],
    "deprecated": false,
    "readme": "readme-version-1.0.0",
    "links": {
        "link1": "https://link1",
        "link2": "https://link2"
    },
    "version": "1.0.0",
    "app_version": "12.1.0",
    "digest": "digest-package1-1.0.0",
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
            display_name,
            description,
            home_url,
            logo_url,
            logo_image_id,
            keywords,
            deprecated,
            latest_version,
            package_kind_id,
            chart_repository_id
        from package
        where name='package1'
    $$,
    $$
        values (
            'package1',
            'Package 1',
            'description',
            'home_url',
            'logo_url',
            '00000000-0000-0000-0000-000000000001'::uuid,
            '{kw1,kw2}'::text[],
            false,
            '1.0.0',
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
            s.app_version,
            s.digest,
            s.readme,
            s.links
        from snapshot s
        join package p using (package_id)
        where name='package1'
        and version='1.0.0'
    $$,
    $$
        values (
            '1.0.0',
            '12.1.0',
            'digest-package1-1.0.0',
            'readme-version-1.0.0',
            '{"link1": "https://link1", "link2": "https://link2"}'::jsonb
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

-- Register a new version of the package previously registered
select register_package('
{
    "kind": 0,
    "name": "package1",
    "display_name": "Package 1 v2",
    "description": "description v2",
    "home_url": "home_url",
    "logo_url": "logo_url",
    "logo_image_id": "00000000-0000-0000-0000-000000000001",
    "keywords": ["kw1", "kw2"],
    "deprecated": true,
    "readme": "readme-version-2.0.0",
    "version": "2.0.0",
    "app_version": "13.0.0",
    "digest": "digest-package1-2.0.0",
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
    $$ select display_name, description, deprecated from package where name='package1' $$,
    $$ values ('Package 1 v2', 'description v2', true) $$,
    'Package display name, description and deprecated should have been updated'
);
select results_eq(
    $$
        select
            s.version,
            s.app_version,
            s.digest,
            s.readme,
            s.links
        from snapshot s
        join package p using (package_id)
        where name='package1'
        and version='2.0.0'
    $$,
    $$
        values (
            '2.0.0',
            '13.0.0',
            'digest-package1-2.0.0',
            'readme-version-2.0.0',
            null::jsonb
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
    "deprecated": true,
    "readme": "readme-version-0.0.9",
    "version": "0.0.9",
    "app_version": "11.0.0",
    "digest": "digest-package1-0.0.9",
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
    $$ select display_name, description from package where name='package1' $$,
    $$ values ('Package 1 v2', 'description v2') $$,
    'Package display name and description should not have been updated'
);
select results_eq(
    $$
        select
            s.version,
            s.app_version,
            s.digest,
            s.readme,
            s.links
        from snapshot s
        join package p using (package_id)
        where name='package1'
        and version='0.0.9'
    $$,
    $$
        values (
            '0.0.9',
            '11.0.0',
            'digest-package1-0.0.9',
            'readme-version-0.0.9',
            null::jsonb
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

-- Finish tests and rollback transaction
select * from finish();
rollback;
