-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set package4ID '00000000-0000-0000-0000-000000000004'
\set package5ID '00000000-0000-0000-0000-000000000005'
\set package6ID '00000000-0000-0000-0000-000000000006'

-- No packages at this point
select is(
    get_packages_with_predicted_category()::jsonb,
    '[]'::jsonb,
    'No packages expected'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');

-- Package with a predicted category (expected, latest version only)
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
    3,
    'predicted',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description,
    keywords
) values (
    :'package1ID',
    '1.0.0',
    repeat('d', 1500),
    '{kw1, kw2}'
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

-- Package whose prediction didn't result in any category (expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_source,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    'predicted',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package2ID',
    '1.0.0'
);

-- Package with a publisher category (not expected)
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
    1,
    'publisher',
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

-- Package with a category but without source (not expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    repository_id
) values (
    :'package5ID',
    'package5',
    '1.0.0',
    1,
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

-- Deprecated package with a predicted category (expected)
insert into package (
    package_id,
    name,
    latest_version,
    package_category_id,
    package_category_source,
    repository_id
) values (
    :'package6ID',
    'package6',
    '1.0.0',
    6,
    'predicted',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    description,
    deprecated
) values (
    :'package6ID',
    '1.0.0',
    'description 6',
    true
);

-- Run some tests
select is(
    get_packages_with_predicted_category()::jsonb,
    jsonb_build_array(
        jsonb_build_object(
            'package_id', '00000000-0000-0000-0000-000000000001',
            'latest_version', '1.0.0',
            'name', 'package1',
            'keywords', '["kw1", "kw2"]'::jsonb,
            'description', repeat('d', 1000),
            'category', 3
        ),
        '{
            "package_id": "00000000-0000-0000-0000-000000000002",
            "latest_version": "1.0.0",
            "name": "package2"
        }'::jsonb,
        '{
            "package_id": "00000000-0000-0000-0000-000000000006",
            "latest_version": "1.0.0",
            "name": "package6",
            "description": "description 6",
            "category": 6
        }'::jsonb
    ),
    'Only packages with a predicted category expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
