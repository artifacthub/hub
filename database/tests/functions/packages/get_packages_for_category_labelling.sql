-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set package4ID '00000000-0000-0000-0000-000000000004'

-- No packages at this point
select is_empty(
    $$ select get_packages_for_category_labelling() $$,
    'No packages expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 1, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    package_category_source,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    1,
    'publisher',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    description,
    keywords,
    readme,
    deprecated
) values (
    :'package1ID',
    '1.0.0',
    repeat('d', 1500),
    '{kw1, kw2}',
    repeat('r', 20000),
    false
);
insert into snapshot (
    package_id,
    version,
    description,
    keywords,
    readme
) values (
    :'package1ID',
    '0.9.0',
    'description 0.9.0',
    '{kw0}',
    'readme 0.9.0'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description,
    deprecated
) values (
    :'package2ID',
    '1.0.0',
    'description',
    true
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package3ID',
    'package3',
    '2.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package3ID',
    '2.0.0'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package4ID',
    'package0',
    '1.0.0',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    description,
    readme
) values (
    :'package4ID',
    '1.0.0',
    'description 4',
    'readme 4'
);

-- Run some tests
select results_eq(
    $$ select get_packages_for_category_labelling()::jsonb $$,
    $$ values
        ('{
            "package_id": "00000000-0000-0000-0000-000000000003",
            "repository_kind": 0,
            "repository_name": "repo1",
            "name": "package3"
        }'::jsonb),
        ('{
            "package_id": "00000000-0000-0000-0000-000000000004",
            "repository_kind": 1,
            "repository_name": "repo2",
            "name": "package0",
            "description": "description 4",
            "readme": "readme 4"
        }'::jsonb),
        (jsonb_build_object(
            'package_id', '00000000-0000-0000-0000-000000000001',
            'repository_kind', 1,
            'repository_name', 'repo2',
            'name', 'package1',
            'description', repeat('d', 1000),
            'keywords', '["kw1", "kw2"]'::jsonb,
            'readme', repeat('r', 16384)
        ))
    $$,
    'Latest version of non deprecated packages expected, ordered by repository and package name'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
