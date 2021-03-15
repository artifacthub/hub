-- Start transaction and plan tests
begin;
select plan(27);

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
select is(
    search_packages('{
        "ts_query_web": "package1"
    }')::jsonb,
    '{
        "data": {
            "packages": []
        },
        "metadata": {
            "total": 0
        }
    }'::jsonb,
    'TSQueryWeb: package1 | No packages in db yet | No packages or facets expected'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id, verified_publisher, official)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID', true, true);
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
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    true,
    10,
    generate_package_tsdoc('package1', null, 'description', '{"kw1", "kw2"}', '{"repo1"}', '{"user1"}'),
    false,
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
    generate_package_tsdoc('package2', null, 'description', '{"kw1", "kw2"}', '{"repo2"}', '{"org1"}'),
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
    generate_package_tsdoc('package3', null, 'description', '{"kw3"}', '{"repo3"}', '{"org1"}'),
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
    '2020-06-16 11:20:34+02'
);

-- Some packages have just been seeded
select is(
    search_packages('{
        "facets": true,
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000003",
                "name": "package3",
                "normalized_name": "package3",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "version": "1.0.0",
                "security_report_summary": {
                    "high": 2,
                    "medium": 1
                },
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": [{
                    "id": "org1",
                    "name": "Organization 1",
                    "total": 2
                }]
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 2
                }, {
                    "id": 1,
                    "name": "Falco rules",
                    "total": 1
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "repo2",
                    "name": "Repo2",
                    "total": 1
                }, {
                    "id": "repo3",
                    "name": "Repo3",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 3
        }
    }'::jsonb,
    'TSQueryWeb: - | Three packages expected (all) - Facets expected'
);
select is(
    search_packages('{
        "ts_query": "kw1 | kw3",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000003",
                "name": "package3",
                "normalized_name": "package3",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "version": "1.0.0",
                "security_report_summary": {
                    "high": 2,
                    "medium": 1
                },
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "total": 3
        }
    }'::jsonb,
    'TSQuery: kw1 | kw3 | Three packages expected (all) - No facets expected'
);
select is(
    search_packages('{
        "operators": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'Operators: true | Package 1 expected - No facets expected'
);
select is(
    search_packages('{
        "verified_publisher": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'VerifiedPublisher: true | Package 1 expected - No facets expected'
);
select is(
    search_packages('{
        "official": true,
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "total": 2
        }
    }'::jsonb,
    'Official: true Deprecated: true | Packages 1 and 2 expected - No facets expected'
);
select is(
    search_packages('{
        "ts_query": "kw1",
        "ts_query_web": "kw2",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "total": 2
        }
    }'::jsonb,
    'TSQuery: kw1 | TSQueryWeb: kw2 | Two packages expected | No facets expected'
);
select is(
    search_packages('{
        "facets": true,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": [{
                    "id": "org1",
                    "name": "Organization 1",
                    "total": 1
                }]
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "repo2",
                    "name": "Repo2",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 2
        }
    }'::jsonb,
    'Facets: true TSQueryWeb: kw1 | Two packages expected - Facets expected'
);
select is(
    search_packages('{
        "facets": true,
        "ts_query_web": "package1"
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": []
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 1
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'Facets: true TSQueryWeb: package1 | Package 1 expected - Facets expected'
);
select is(
    search_packages('{
        "ts_query_web": "kw9"
    }')::jsonb,
    '{
        "data": {
            "packages": []
        },
        "metadata": {
            "total": 0
        }
    }'::jsonb,
    'TSQueryWeb: kw9 (inexistent) | No packages or facets expected'
);

-- Tests with kind and repositories filters
select is(
    search_packages('{
        "repositories": [
            "repo1"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'TSQueryWeb: - Repo: repo1 | Package 1 expected - Facets not expected'
);
select is(
    search_packages(
    '{
        "facets": true,
        "ts_query_web": "kw1",
        "repositories": [
            "repo2"
        ],
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": [{
                    "id": "org1",
                    "name": "Organization 1",
                    "total": 1
                }]
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo2",
                    "name": "Repo2",
                    "total": 1
                }, {
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'Facets: true TSQueryWeb: kw1 Repo: repo2 | Package 2 expected - Facets expected'
);
select is(
    search_packages(
    '{
        "facets": true,
        "ts_query_web": "kw1",
        "repositories": [
            "repo2"
        ],
        "deprecated": false
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": []
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 1
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 0
        }
    }'::jsonb,
    'Facets: true TSQueryWeb: kw1 Repo: repo2 Deprecated: false | No packages expected - Facets expected'
);
select is(
    search_packages(
    '{
        "facets": true,
        "ts_query_web": "kw1",
        "repositories": [
            "repo2"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": []
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 1
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 0
        }
    }'::jsonb,
    'Facets: true TSQueryWeb: kw1 Repo: repo2 Deprecated: not provided | No packages expected - Facets expected'
);
select is(
    search_packages('{
        "facets": true,
        "ts_query_web": "kw1",
        "repositories": [
            "repo3"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": []
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 1
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "total": 0
        }
    }'::jsonb,
    'Facets: true TSQueryWeb: kw1 Repo: inexistent | No packages expected - Facets expected'
);
select is(
    search_packages('{
        "facets": false,
        "ts_query_web": "kw1",
        "repository_kinds": [1, 2]
    }')::jsonb,
    '{
        "data": {
            "packages": []
        },
        "metadata": {
            "total": 0
        }
    }'::jsonb,
    'Facets: false TSQueryWeb: kw1 Kinds: 1, 2 | No packages or facets expected'
);

-- Tests with with orgs and users filters
select is(
    search_packages('{
        "orgs": [
            "org1"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000003",
                "name": "package3",
                "normalized_name": "package3",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "version": "1.0.0",
                "security_report_summary": {
                    "high": 2,
                    "medium": 1
                },
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'TSQueryWeb: - Org: org1 | Package 3 expected - Facets not expected'
);
select is(
    search_packages('{
        "users": [
            "user1"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'TSQueryWeb: - User: user1 | Package 1 expected - Facets not expected'
);
select is(
    search_packages('{
        "orgs": [
            "org1"
        ],
        "users": [
            "user1"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000003",
                "name": "package3",
                "normalized_name": "package3",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "version": "1.0.0",
                "security_report_summary": {
                    "high": 2,
                    "medium": 1
                },
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "url": "https://repo3.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "total": 2
        }
    }'::jsonb,
    'TSQueryWeb: - Org: org1 User: user1 | Packages 1 and 3 expected - Facets not expected'
);

-- Tests with with license filter
select is(
    search_packages('{
        "licenses": [
            "Apache-2.0"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'TSQueryWeb: - License: Apache-2.0 | Package 1 expected - Facets not expected'
);

-- Tests with with capabilities filter
select is(
    search_packages('{
        "capabilities": [
            "basic install"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "total": 1
        }
    }'::jsonb,
    'TSQueryWeb: - Capabilities: basic install | Package 1 expected - Facets not expected'
);

-- Tests with limit and offset
select is(
    search_packages('{
        "limit": 2,
        "offset": 0,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }, {
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "limit": 2,
            "offset": 0,
            "total": 2
        }
    }'::jsonb,
    'Limit: 2 Offset: 0 TSQueryWeb: kw1 | Packages 1 and 2 expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 0,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "package_id": "00000000-0000-0000-0000-000000000001",
                "name": "package1",
                "normalized_name": "package1",
                "stars": 10,
                "official": false,
                "display_name": "Package 1",
                "description": "description",
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "license": "Apache-2.0",
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "url": "https://repo1.com",
                    "verified_publisher": true,
                    "official": true,
                    "user_alias": "user1"
                }
            }]
        },
        "metadata": {
            "limit": 1,
            "offset": 0,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 0 TSQueryWeb: kw1 | Package 1 expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 2,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": []
        },
        "metadata": {
            "limit": 1,
            "offset": 2,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 2 TSQueryWeb: kw1 | No packages expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 1,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [{
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
                "signed": true,
                "ts": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "url": "https://repo2.com",
                    "verified_publisher": false,
                    "official": false,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }]
        },
        "metadata": {
            "limit": 1,
            "offset": 1,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 1 TSQueryWeb: kw1 | Package 2 expected'
);
select is(
    search_packages('{
        "limit": 0,
        "offset": 0,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": []
        },
        "metadata": {
            "limit": 0,
            "offset": 0,
            "total": 2
        }
    }'::jsonb,
    'Limit: 0 Offset: 0 TSQueryWeb: kw1 | No packages expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 2,
        "facets": true,
        "ts_query_web": "kw1",
        "deprecated": true
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": [{
                "title": "Organization",
                "filter_key": "org",
                "options": [{
                    "id": "org1",
                    "name": "Organization 1",
                    "total": 1
                }]
            }, {
                "title": "User",
                "filter_key": "user",
                "options": [{
                    "id": "user1",
                    "name": "user1",
                    "total": 1
                }]
            }, {
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Helm charts",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "repo1",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "repo2",
                    "name": "Repo2",
                    "total": 1
                }]
            }, {
                "title": "License",
                "filter_key": "license",
                "options": [{
                    "id": "Apache-2.0",
                    "name": "Apache-2.0",
                    "total": 1
                }]
            }, {
                "title": "Operator capabilities",
                "filter_key": "capabilities",
                "options": [{
                    "id": "basic install",
                    "name": "basic install",
                    "total": 1
                }]
            }]
        },
        "metadata": {
            "limit": 1,
            "offset": 2,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 2 TSQueryWeb: kw1 | No packages expected - Facets expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
