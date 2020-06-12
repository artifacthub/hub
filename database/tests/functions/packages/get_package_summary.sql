-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into chart_repository (chart_repository_id, name, display_name, url, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    stars,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'image1ID',
    10,
    0,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    display_name,
    description,
    deprecated,
    signed
) values (
    :'package1ID',
    '1.0.0',
    '12.0.0',
    'Package 1',
    'description',
    false,
    false
);

-- Run some tests
select is(
    get_package_summary(:'package1ID')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "kind": 0,
        "name": "package1",
        "normalized_name": "package1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "stars": 10,
        "display_name": "Package 1",
        "description": "description",
        "version": "1.0.0",
        "app_version": "12.0.0",
        "deprecated": false,
        "signed": false,
        "user_alias": null,
        "organization_name": "org1",
        "organization_display_name": "Organization 1",
        "chart_repository": {
            "chart_repository_id": "00000000-0000-0000-0000-000000000001",
            "name": "repo1",
            "display_name": "Repo 1"
        }
    }'::jsonb,
    'Package1 details should be returned as a json object'
);
select is_empty(
    $$
        select get_package_summary('00000000-0000-0000-0000-000000000002')::jsonb
    $$,
    'No results expected for inexisting package'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
