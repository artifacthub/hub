-- Start transaction and plan tests
begin;
select plan(31);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set repo3ID '00000000-0000-0000-0000-000000000003'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set package3ID '00000000-0000-0000-0000-000000000003'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'
\set image3ID '00000000-0000-0000-0000-000000000003'

-- No packages at this point
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query_web": "package1"
        }')
    $$,
    $$
        values (
            '{
                "packages": []
            }'::jsonb,
            0
        )
    $$,
    'TSQueryWeb: package1 | No packages in db yet | No packages or facets expected'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id, verified_publisher, official, cncf)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID', true, true, true);
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', 1, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    is_operator,
    stars,
    tsdoc,
    official,
    cncf,
    package_category_id,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    true,
    10,
    generate_package_tsdoc('package1', null, null, 'description', '{"kw1", "kw1", "kw2"}', '{"repo1"}', '{"user1"}'),
    false,
    true,
    1,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    app_version,
    license,
    digest,
    readme,
    capabilities,
    ts
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    :'image1ID',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'Apache-2.0',
    'digest-package1-1.0.0',
    'readme',
    'basic install',
    '2020-06-16 11:20:35+02'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    ts
) values (
    :'package1ID',
    '0.0.9',
    'Package 1',
    'description',
    :'image1ID',
    '{"kw1", "kw2"}',
    'home_url',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme',
    '2020-06-16 11:20:33+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    stars,
    tsdoc,
    official,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    11,
    generate_package_tsdoc('package2', null, null, 'description', '{"kw1", "kw2"}', '{"repo2"}', '{"org1"}'),
    true,
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    deprecated,
    signed,
    signatures,
    containers_images,
    ts
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    :'image2ID',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'digest-package2-1.0.0',
    'readme',
    true,
    true,
    '{"cosign"}',
    '[{"image": "quay.io/org/img:1.0.0", "whitelisted": false}]',
    '2020-06-16 11:20:34+02'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    ts
) values (
    :'package2ID',
    '0.0.9',
    'Package 2',
    'description',
    :'image2ID',
    '{"kw1", "kw2"}',
    'home_url',
    '12.0.0',
    'digest-package2-0.0.9',
    'readme',
    '2020-06-16 11:20:33+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    tsdoc,
    repository_id
) values (
    :'package3ID',
    'package3',
    '1.0.0',
    generate_package_tsdoc('package3', null, null, 'description', '{"kw3"}', '{"repo3"}', '{"org1"}'),
    :'repo3ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    readme,
    security_report_summary,
    containers_images,
    values_schema,
    ts
) values (
    :'package3ID',
    '1.0.0',
    'Package 3',
    'description',
    :'image3ID',
    '{"kw3"}',
    'readme',
    '{"high": 2, "medium": 1}',
    '[{"image": "quay.io/org/img:1.0.0", "whitelisted": true}]',
    '{"key": "value"}',
    '2020-06-16 11:20:34+02'
);
insert into production_usage (package_id, organization_id) values(:'package1ID', :'org1ID');

-- Some packages have just been seeded
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "has_values_schema": false,
                        "license": "Apache-2.0",
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000003",
                        "name": "package3",
                        "normalized_name": "package3",
                        "stars": 0,
                        "display_name": "Package 3",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000003",
                        "version": "1.0.0",
                        "has_values_schema": true,
                        "security_report_summary": {
                            "high": 2,
                            "medium": 1
                        },
                        "all_containers_images_whitelisted": true,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000003",
                            "kind": 1,
                            "name": "repo3",
                            "display_name": "Repo 3",
                            "url": "https://repo3.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": [{
                            "id": 1,
                            "name": "Falco rules",
                            "total": 1
                        }, {
                            "id": 0,
                            "name": "Helm charts",
                            "total": 2
                        }]
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": [{
                            "id": 1,
                            "name": "AI / Machine learning",
                            "total": 1
                        }]
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": [{
                            "id": "Apache-2.0",
                            "name": "Apache-2.0",
                            "total": 1
                        }]
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": [{
                            "id": "basic install",
                            "name": "basic install",
                            "total": 1
                        }]
                    }
                ]
            }'::jsonb,
            3
        )
    $$,
    'TSQueryWeb: - | Three packages expected (all) - Facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query": "kw1 | kw3",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000003",
                        "name": "package3",
                        "normalized_name": "package3",
                        "stars": 0,
                        "display_name": "Package 3",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000003",
                        "version": "1.0.0",
                        "has_values_schema": true,
                        "security_report_summary": {
                            "high": 2,
                            "medium": 1
                        },
                        "all_containers_images_whitelisted": true,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000003",
                            "kind": 1,
                            "name": "repo3",
                            "display_name": "Repo 3",
                            "url": "https://repo3.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ]
            }'::jsonb,
            3
        )
    $$,
    'TSQuery: kw1 | kw3 | Three packages expected (all) - No facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "operators": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'Operators: true | Package 1 expected - No facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "verified_publisher": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'VerifiedPublisher: true | Package 1 expected - No facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "official": true,
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Official: true Deprecated: true | Packages 1 and 2 expected - No facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "cncf": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'CNCF: true | Packages 1 expected - No facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query": "kw1",
            "ts_query_web": "kw2",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'TSQuery: kw1 | TSQueryWeb: kw2 | Two packages expected | No facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": [{
                            "id": 0,
                            "name": "Helm charts",
                            "total": 2
                        }]
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": [{
                            "id": 1,
                            "name": "AI / Machine learning",
                            "total": 1
                        }]
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": [{
                            "id": "Apache-2.0",
                            "name": "Apache-2.0",
                            "total": 1
                        }]
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": [{
                            "id": "basic install",
                            "name": "basic install",
                            "total": 1
                        }]
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Facets: true TSQueryWeb: kw1 | Two packages expected - Facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "ts_query_web": "package1"
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": [{
                            "id": 0,
                            "name": "Helm charts",
                            "total": 1
                        }]
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": [{
                            "id": 1,
                            "name": "AI / Machine learning",
                            "total": 1
                        }]
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": [{
                            "id": "Apache-2.0",
                            "name": "Apache-2.0",
                            "total": 1
                        }]
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": [{
                            "id": "basic install",
                            "name": "basic install",
                            "total": 1
                        }]
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'Facets: true TSQueryWeb: package1 | Package 1 expected - Facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query_web": "kw9"
        }')
    $$,
    $$
        values (
            '{
                "packages": []
            }'::jsonb,
            0
        )
    $$,
    'TSQueryWeb: kw9 (inexistent) | No packages or facets expected'
);

-- Tests with kind and repositories filters
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "repositories": [
                "repo1"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'TSQueryWeb: - Repo: repo1 | Package 1 expected - Facets not expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "ts_query_web": "kw1",
            "repositories": [
                "repo2"
            ],
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": [{
                            "id": 0,
                            "name": "Helm charts",
                            "total": 1
                        }]
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": []
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": []
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": []
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'Facets: true TSQueryWeb: kw1 Repo: repo2 | Package 2 expected - Facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "ts_query_web": "kw1",
            "repositories": [
                "repo2"
            ],
            "deprecated": false
        }')
    $$,
    $$
        values (
            '{
                "packages": [],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": []
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": []
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": []
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": []
                    }
                ]
            }'::jsonb,
            0
        )
    $$,
    'Facets: true TSQueryWeb: kw1 Repo: repo2 Deprecated: false | No packages expected - Empty facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "ts_query_web": "kw1",
            "repositories": [
                "repo2"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": []
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": []
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": []
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": []
                    }
                ]
            }'::jsonb,
            0
        )
    $$,
    'Facets: true TSQueryWeb: kw1 Repo: repo2 Deprecated: not provided | No packages expected - Empty facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": true,
            "ts_query_web": "kw1",
            "repositories": [
                "repo3"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": []
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": []
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": []
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": []
                    }
                ]
            }'::jsonb,
            0
        )
    $$,
    'Facets: true TSQueryWeb: kw1 Repo: inexistent | No packages expected - Empty facets expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "facets": false,
            "ts_query_web": "kw1",
            "repository_kinds": [1, 2]
        }')
    $$,
    $$
        values (
            '{
                "packages": []
            }'::jsonb,
            0
        )
    $$,
    'Facets: false TSQueryWeb: kw1 Kinds: 1, 2 | No packages or facets expected'
);

-- Tests with orgs and users filters
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "orgs": [
                "org1"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000003",
                        "name": "package3",
                        "normalized_name": "package3",
                        "stars": 0,
                        "display_name": "Package 3",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000003",
                        "version": "1.0.0",
                        "has_values_schema": true,
                        "security_report_summary": {
                            "high": 2,
                            "medium": 1
                        },
                        "all_containers_images_whitelisted": true,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000003",
                            "kind": 1,
                            "name": "repo3",
                            "display_name": "Repo 3",
                            "url": "https://repo3.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'TSQueryWeb: - Org: org1 | Package 3 expected - Facets not expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "users": [
                "user1"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'TSQueryWeb: - User: user1 | Package 1 expected - Facets not expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "orgs": [
                "org1"
            ],
            "users": [
                "user1"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000003",
                        "name": "package3",
                        "normalized_name": "package3",
                        "stars": 0,
                        "display_name": "Package 3",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000003",
                        "version": "1.0.0",
                        "has_values_schema": true,
                        "security_report_summary": {
                            "high": 2,
                            "medium": 1
                        },
                        "all_containers_images_whitelisted": true,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000003",
                            "kind": 1,
                            "name": "repo3",
                            "display_name": "Repo 3",
                            "url": "https://repo3.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'TSQueryWeb: - Org: org1 User: user1 | Packages 1 and 3 expected - Facets not expected'
);

-- Tests with license filter
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "licenses": [
                "Apache-2.0"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'TSQueryWeb: - License: Apache-2.0 | Package 1 expected - Facets not expected'
);

-- Tests with capabilities filter
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "capabilities": [
                "basic install"
            ]
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            1
        )
    $$,
    'TSQueryWeb: - Capabilities: basic install | Package 1 expected - Facets not expected'
);

-- Tests with limit and offset
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "limit": 2,
            "offset": 0,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Limit: 2 Offset: 0 TSQueryWeb: kw1 | Packages 1 and 2 expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "limit": 1,
            "offset": 0,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Limit: 1 Offset: 0 TSQueryWeb: kw1 | Package 2 expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "limit": 1,
            "offset": 2,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": []
            }'::jsonb,
            2
        )
    $$,
    'Limit: 1 Offset: 2 TSQueryWeb: kw1 | No packages expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "limit": 1,
            "offset": 1,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Limit: 1 Offset: 1 TSQueryWeb: kw1 | Package 1 expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "limit": 0,
            "offset": 0,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": []
            }'::jsonb,
            2
        )
    $$,
    'Limit: 0 Offset: 0 TSQueryWeb: kw1 | No packages expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "limit": 1,
            "offset": 2,
            "facets": true,
            "ts_query_web": "kw1",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [],
                "facets": [
                    {
                        "title": "Kind",
                        "filter_key": "kind",
                        "options": [{
                            "id": 0,
                            "name": "Helm charts",
                            "total": 2
                        }]
                    },
                    {
                        "title": "Category",
                        "filter_key": "category",
                        "options": [{
                            "id": 1,
                            "name": "AI / Machine learning",
                            "total": 1
                        }]
                    },
                    {
                        "title": "License",
                        "filter_key": "license",
                        "options": [{
                            "id": "Apache-2.0",
                            "name": "Apache-2.0",
                            "total": 1
                        }]
                    },
                    {
                        "title": "Operator capabilities",
                        "filter_key": "capabilities",
                        "options": [{
                            "id": "basic install",
                            "name": "basic install",
                            "total": 1
                        }]
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Limit: 1 Offset: 2 TSQueryWeb: kw1 | No packages expected - Facets expected'
);

-- Tests with sort
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query_web": "kw1",
            "sort": "relevance",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Sort: relevance TSQueryWeb: kw1 | Packages 1 and 2 expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query_web": "kw1",
            "sort": "stars",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Sort: stars TSQueryWeb: kw1 | Packages 2 and 1 expected'
);
select results_eq(
    $$
        select data::jsonb, total_count::integer from search_packages('{
            "ts_query_web": "kw1",
            "sort": "last_updated",
            "deprecated": true
        }')
    $$,
    $$
        values (
            '{
                "packages": [
                    {
                        "package_id": "00000000-0000-0000-0000-000000000001",
                        "name": "package1",
                        "normalized_name": "package1",
                        "category": 1,
                        "stars": 10,
                        "official": false,
                        "cncf": true,
                        "display_name": "Package 1",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000001",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "license": "Apache-2.0",
                        "has_values_schema": false,
                        "production_organizations_count": 1,
                        "ts": 1592299235,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000001",
                            "kind": 0,
                            "name": "repo1",
                            "display_name": "Repo 1",
                            "url": "https://repo1.com",
                            "verified_publisher": true,
                            "official": true,
                            "cncf": true,
                            "scanner_disabled": false,
                            "user_alias": "user1"
                        }
                    },
                    {
                        "package_id": "00000000-0000-0000-0000-000000000002",
                        "name": "package2",
                        "normalized_name": "package2",
                        "stars": 11,
                        "official": true,
                        "display_name": "Package 2",
                        "description": "description",
                        "logo_image_id": "00000000-0000-0000-0000-000000000002",
                        "version": "1.0.0",
                        "app_version": "12.1.0",
                        "deprecated": true,
                        "has_values_schema": false,
                        "signed": true,
                        "signatures": ["cosign"],
                        "all_containers_images_whitelisted": false,
                        "production_organizations_count": 0,
                        "ts": 1592299234,
                        "repository": {
                            "repository_id": "00000000-0000-0000-0000-000000000002",
                            "kind": 0,
                            "name": "repo2",
                            "display_name": "Repo 2",
                            "url": "https://repo2.com",
                            "verified_publisher": false,
                            "official": false,
                            "scanner_disabled": false,
                            "organization_name": "org1",
                            "organization_display_name": "Organization 1"
                        }
                    }
                ]
            }'::jsonb,
            2
        )
    $$,
    'Sort: last_updated TSQueryWeb: kw1 | Packages 1 and 2 expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
