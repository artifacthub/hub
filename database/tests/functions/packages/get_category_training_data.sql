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
\set package5ID '00000000-0000-0000-0000-000000000005'
\set package6ID '00000000-0000-0000-0000-000000000006'
\set package7ID '00000000-0000-0000-0000-000000000007'

-- No packages at this point
select is_empty(
    $$ select get_category_training_data() $$,
    'No training data expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 3, :'org1ID');

-- Package with a publisher category (expected, latest version only)
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
    2,
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
    'readme',
    false
);
insert into snapshot (
    package_id,
    version,
    description,
    keywords
) values (
    :'package1ID',
    '0.9.0',
    'description 0.9.0',
    '{kw0}'
);

-- Deprecated package with a publisher category (not expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    package_category_source,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    5,
    'publisher',
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

-- Package with a predicted category (not expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    package_category_source,
    repository_id
) values (
    :'package3ID',
    'package3',
    '1.0.0',
    3,
    'predicted',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description
) values (
    :'package3ID',
    '1.0.0',
    'description'
);

-- Package whose category prediction was skipped (not expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_source,
    repository_id
) values (
    :'package4ID',
    'package4',
    '1.0.0',
    'skip',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description
) values (
    :'package4ID',
    '1.0.0',
    'description'
);

-- Package with a publisher source but without category (not expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_source,
    repository_id
) values (
    :'package5ID',
    'package5',
    '1.0.0',
    'publisher',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description
) values (
    :'package5ID',
    '1.0.0',
    'description'
);

-- Package with a category but without source (not expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    repository_id
) values (
    :'package6ID',
    'package6',
    '1.0.0',
    1,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description
) values (
    :'package6ID',
    '1.0.0',
    'description'
);

-- Package with a publisher category and no description or keywords (expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    package_category_source,
    repository_id
) values (
    :'package7ID',
    'package7',
    '1.0.0',
    7,
    'publisher',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package7ID',
    '1.0.0'
);

-- Run some tests
select results_eq(
    $$ select get_category_training_data()::jsonb $$,
    $$ values
        ('{
            "repository_kind": 0,
            "repository_name": "repo1",
            "name": "package7",
            "category": 7
        }'::jsonb),
        (jsonb_build_object(
            'repository_kind', 3,
            'repository_name', 'repo2',
            'name', 'package1',
            'description', repeat('d', 1000),
            'keywords', '["kw1", "kw2"]'::jsonb,
            'category', 2
        ))
    $$,
    'Only non deprecated packages with a publisher category expected, ordered by repository and package name'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
