-- Start transaction and plan tests
begin;
select plan(3);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set image1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    stars,
    official,
    cncf,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    10,
    true,
    true,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    display_name,
    description,
    logo_image_id,
    license,
    deprecated,
    signed,
    signatures,
    containers_images,
    security_report_summary,
    ts
) values (
    :'package1ID',
    '1.0.0',
    '12.0.0',
    'Package 1',
    'description',
    :'image1ID',
    'Apache-2.0',
    false,
    true,
    '{"cosign"}',
    '[{"image": "quay.io/org/img:1.0.0", "whitelisted": true}]',
    '{"high": 2, "medium": 1}',
    '2020-06-16 11:20:34+02'
);
insert into production_usage (package_id, organization_id) values(:'package1ID', :'org1ID');

-- Run some tests
select is(
    get_package_summary('{
        "package_id": "00000000-0000-0000-0000-000000000001"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "package1",
        "normalized_name": "package1",
        "stars": 10,
        "official": true,
        "cncf": true,
        "display_name": "Package 1",
        "description": "description",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "version": "1.0.0",
        "app_version": "12.0.0",
        "license": "Apache-2.0",
        "deprecated": false,
        "signed": true,
        "signatures": ["cosign"],
        "security_report_summary": {
            "high": 2,
            "medium": 1
        },
        "all_containers_images_whitelisted": true,
        "production_organizations_count": 1,
        "ts": 1592299234,
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "scanner_disabled": false,
            "organization_name": "org1",
            "organization_display_name": "Organization 1"
        }
    }'::jsonb,
    'Package1 details should be returned as a json object'
);
select is(
    get_package_summary('{
        "repository_name": "repo1",
        "package_name": "package1"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "package1",
        "normalized_name": "package1",
        "stars": 10,
        "official": true,
        "cncf": true,
        "display_name": "Package 1",
        "description": "description",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "version": "1.0.0",
        "app_version": "12.0.0",
        "license": "Apache-2.0",
        "deprecated": false,
        "signed": true,
        "signatures": ["cosign"],
        "security_report_summary": {
            "high": 2,
            "medium": 1
        },
        "all_containers_images_whitelisted": true,
        "production_organizations_count": 1,
        "ts": 1592299234,
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "scanner_disabled": false,
            "organization_name": "org1",
            "organization_display_name": "Organization 1"
        }
    }'::jsonb,
    'Package1 details should be returned as a json object'
);
select is_empty(
    $$
        select get_package_summary('{
            "package_id": "00000000-0000-0000-0000-000000000002"
        }')::jsonb
    $$,
    'No results expected for inexisting package'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
