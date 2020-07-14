-- Start transaction and plan tests
begin;
select plan(22);

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
            "packages": [],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 0
        }
    }'::jsonb,
    'TsQueryWeb: package1 | No packages in db yet | No packages or facets expected'
);

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo3ID', 'repo3', 'Repo 3', 'https://repo3.com', 1, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    is_operator,
    stars,
    tsdoc,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'image1ID',
    true,
    10,
    generate_package_tsdoc('package1', null, 'description', '{"kw1", "kw2"}'),
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    created_at
) values (
    :'package1ID',
    '1.0.0',
    'Package 1',
    'description',
    '{"kw1", "kw2"}',
    'home_url',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme',
    '2020-06-16 11:20:34+02'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    created_at
) values (
    :'package1ID',
    '0.0.9',
    'Package 1',
    'description',
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
    logo_image_id,
    stars,
    tsdoc,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'image2ID',
    11,
    generate_package_tsdoc('package2', null, 'description', '{"kw1", "kw2"}'),
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    deprecated,
    signed,
    created_at
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
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
    keywords,
    home_url,
    app_version,
    digest,
    readme,
    created_at
) values (
    :'package2ID',
    '0.0.9',
    'Package 2',
    'description',
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
    logo_image_id,
    tsdoc,
    repository_id
) values (
    :'package3ID',
    'package3',
    '1.0.0',
    :'image3ID',
    generate_package_tsdoc('package3', null, 'description', '{"kw3"}'),
    :'repo3ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    readme,
    created_at
) values (
    :'package3ID',
    '1.0.0',
    'Package 3',
    'description',
    '{"kw3"}',
    'readme',
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000002",
                "name": "package2",
                "normalized_name": "package2",
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000003",
                "name": "package3",
                "normalized_name": "package3",
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "version": "1.0.0",
                "app_version": null,
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "user_alias": null,
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 3
        }
    }'::jsonb,
    'TsQueryWeb: - | Three packages expected (all) - Facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000002",
                "name": "package2",
                "normalized_name": "package2",
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000003",
                "name": "package3",
                "normalized_name": "package3",
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "version": "1.0.0",
                "app_version": null,
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 3
        }
    }'::jsonb,
    'TsQuery: kw1 | kw3 | Three packages expected (all) - No facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 1
        }
    }'::jsonb,
    'Operators: true | Package 1 expected - No facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000002",
                "name": "package2",
                "normalized_name": "package2",
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 2
        }
    }'::jsonb,
    'TsQuery: kw1 | TsQueryWeb: kw2 | Two packages expected | No facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000002",
                "name": "package2",
                "normalized_name": "package2",
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 2
        }
    }'::jsonb,
    'Facets: true TsQueryWeb: kw1 | Two packages expected - Facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 1
        }
    }'::jsonb,
    'Facets: true TsQueryWeb: package1 | Package 1 expected - Facets expected'
);
select is(
    search_packages('{
        "ts_query_web": "kw9"
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 0
        }
    }'::jsonb,
    'TsQueryWeb: kw9 (inexistent) | No packages or facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 1
        }
    }'::jsonb,
    'TsQueryWeb: - Repo: repo1 | Package 1 expected - Facets not expected'
);
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
                "logo_image_id": "00000000-0000-0000-0000-000000000003",
                "stars": 0,
                "display_name": "Package 3",
                "description": "description",
                "version": "1.0.0",
                "app_version": null,
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000003",
                    "kind": 1,
                    "name": "repo3",
                    "display_name": "Repo 3",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 1
        }
    }'::jsonb,
    'TsQueryWeb: - Org: org1 | Package 3 expected - Facets not expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 1
        }
    }'::jsonb,
    'TsQueryWeb: - User: user1 | Package 1 expected - Facets not expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 1
        }
    }'::jsonb,
    'Facets: true TsQueryWeb: kw1 Repo: repo2 | Package 2 expected - Facets expected'
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 0
        }
    }'::jsonb,
    'Facets: true TsQueryWeb: kw1 Repo: repo2 Deprecated: false | No packages expected - Facets expected'
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 0
        }
    }'::jsonb,
    'Facets: true TsQueryWeb: kw1 Repo: repo2 Deprecated: not provided | No packages expected - Facets expected'
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
            }]
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 0
        }
    }'::jsonb,
    'Facets: true TsQueryWeb: kw1 Repo: inexistent | No packages expected - Facets expected'
);
select is(
    search_packages('{
        "facets": false,
        "ts_query_web": "kw1",
        "repository_kinds": [1, 2]
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": null
        },
        "metadata": {
            "limit": null,
            "offset": null,
            "total": 0
        }
    }'::jsonb,
    'Facets: false TsQueryWeb: kw1 Kinds: 1, 2 | No packages or facets expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }, {
                "package_id": "00000000-0000-0000-0000-000000000002",
                "name": "package2",
                "normalized_name": "package2",
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": 2,
            "offset": 0,
            "total": 2
        }
    }'::jsonb,
    'Limit: 2 Offset: 0 TsQueryWeb: kw1 | Packages 1 and 2 expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000001",
                "stars": 10,
                "display_name": "Package 1",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": null,
                "signed": null,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000001",
                    "kind": 0,
                    "name": "repo1",
                    "display_name": "Repo 1",
                    "user_alias": "user1",
                    "organization_name": null,
                    "organization_display_name": null
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": 1,
            "offset": 0,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 0 TsQueryWeb: kw1 | Package 1 expected'
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
            "packages": [],
            "facets": null
        },
        "metadata": {
            "limit": 1,
            "offset": 2,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 2 TsQueryWeb: kw1 | No packages expected'
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
                "logo_image_id": "00000000-0000-0000-0000-000000000002",
                "stars": 11,
                "display_name": "Package 2",
                "description": "description",
                "version": "1.0.0",
                "app_version": "12.1.0",
                "deprecated": true,
                "signed": true,
                "created_at": 1592299234,
                "repository": {
                    "repository_id": "00000000-0000-0000-0000-000000000002",
                    "kind": 0,
                    "name": "repo2",
                    "display_name": "Repo 2",
                    "user_alias": null,
                    "organization_name": "org1",
                    "organization_display_name": "Organization 1"
                }
            }],
            "facets": null
        },
        "metadata": {
            "limit": 1,
            "offset": 1,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 1 TsQueryWeb: kw1 | Package 2 expected'
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
            "packages": [],
            "facets": null
        },
        "metadata": {
            "limit": 0,
            "offset": 0,
            "total": 2
        }
    }'::jsonb,
    'Limit: 0 Offset: 0 TsQueryWeb: kw1 | No packages expected'
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
            }]
        },
        "metadata": {
            "limit": 1,
            "offset": 2,
            "total": 2
        }
    }'::jsonb,
    'Limit: 1 Offset: 2 TsQueryWeb: kw1 | No packages expected - Facets expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
