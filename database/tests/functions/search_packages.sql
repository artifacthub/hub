-- Start transaction and plan tests
begin;
select plan(19);

-- Declare some variables
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- Using invalid queries
select throws_ok(
    $$ select search_packages('{}')::jsonb $$,
    'invalid query text',
    'Query text must be provided when not filtering by repo'
);
select throws_ok(
    $$ select search_packages('{"text": ""}')::jsonb $$,
    'invalid query text',
    'Query text cannot be empty when not filtering by repo'
);

-- When filtering by repo is ok to omit or use an empty text
select lives_ok(
    $$ select search_packages('{
        "chart_repositories_ids": [
            "00000000-0000-0000-0000-000000000001"
        ]
    }')::jsonb $$,
    'Query text can be omitted when filtering by repo'
);
select lives_ok(
    $$ select search_packages('{
        "text": "",
        "chart_repositories_ids": [
            "00000000-0000-0000-0000-000000000001"
        ]
    }')::jsonb $$,
    'Query text can be empty when filtering by repo'
);

-- No packages at this point
select is(
    search_packages('{
        "text": "package1"
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
    'Text: package1 | No packages in db yet | No packages or facets expected'
);

-- Seed some packages
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com');
insert into chart_repository (chart_repository_id, name, display_name, url)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com');
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    image_id,
    keywords,
    latest_version,
    package_kind_id,
    chart_repository_id
) values (
    :'package1ID',
    'package1',
    'Package 1',
    'description',
    'home_url',
    :'image1ID',
    '{"kw1", "kw2"}',
    '1.0.0',
    0,
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package1ID',
    '1.0.0',
    '12.1.0',
    'digest-package1-1.0.0',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package1ID',
    '0.0.9',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);
insert into package (
    package_id,
    name,
    display_name,
    description,
    home_url,
    image_id,
    keywords,
    latest_version,
    package_kind_id,
    chart_repository_id
) values (
    :'package2ID',
    'package2',
    'Package 2',
    'description',
    'home_url',
    :'image2ID',
    '{"kw1", "kw2"}',
    '1.0.0',
    0,
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package2ID',
    '1.0.0',
    '12.1.0',
    'digest-package2-1.0.0',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);
insert into snapshot (
    package_id,
    version,
    app_version,
    digest,
    readme,
    links
) values (
    :'package2ID',
    '0.0.9',
    '12.0.0',
    'digest-package2-0.0.9',
    'readme',
    '{"link1": "https://link1", "link2": "https://link2"}'
);

-- Some packages have just been seeded
select is(
    search_packages('{
        "facets": true,
        "text": "kw1"
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package1",
                "image_id": "00000000-0000-0000-0000-000000000001",
                "package_id": "00000000-0000-0000-0000-000000000001",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 1",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1"
                }
            }, {
                "kind": 0,
                "name": "package2",
                "image_id": "00000000-0000-0000-0000-000000000002",
                "package_id": "00000000-0000-0000-0000-000000000002",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 2",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2"
                }
            }],
            "facets": [{
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Chart",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "00000000-0000-0000-0000-000000000001",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "00000000-0000-0000-0000-000000000002",
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
    'Facets: true Text: kw1 | Two packages expected - Facets expected'
);
select is(
    search_packages('{
        "facets": true,
        "text": "package1"
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package1",
                "image_id": "00000000-0000-0000-0000-000000000001",
                "package_id": "00000000-0000-0000-0000-000000000001",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 1",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1"
                }
            }],
            "facets": [{
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Chart",
                    "total": 1
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "00000000-0000-0000-0000-000000000001",
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
    'Facets: true Text: package1 | Package 1 expected - Facets expected'
);
select is(
    search_packages('{
        "text": "kw3"
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
    'Text: kw3 (inexistent) | No packages or facets expected'
);

-- Tests with kind and repositories filters
select is(
    search_packages('{
        "chart_repositories_ids": [
            "00000000-0000-0000-0000-000000000001"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package1",
                "image_id": "00000000-0000-0000-0000-000000000001",
                "package_id": "00000000-0000-0000-0000-000000000001",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 1",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1"
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
    'Text: missing Repo: repo1 | Package 1 expected - Facets not expected'
);
select is(
    search_packages('{
        "text": "",
        "chart_repositories_ids": [
            "00000000-0000-0000-0000-000000000001"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package1",
                "image_id": "00000000-0000-0000-0000-000000000001",
                "package_id": "00000000-0000-0000-0000-000000000001",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 1",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1"
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
    'Text: empty Repo: repo1 | Package 1 expected - Facets not expected'
);
select is(
    search_packages(
    '{
        "facets": true,
        "text": "kw1",
        "chart_repositories_ids": [
            "00000000-0000-0000-0000-000000000002"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package2",
                "image_id": "00000000-0000-0000-0000-000000000002",
                "package_id": "00000000-0000-0000-0000-000000000002",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 2",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2"
                }
            }],
            "facets": [{
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Chart",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "00000000-0000-0000-0000-000000000001",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "00000000-0000-0000-0000-000000000002",
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
    'Facets: true Text: kw1 Repo: repo2 | Package 2 expected - Facets expected'
);
select is(
    search_packages('{
        "facets": true,
        "text": "kw1",
        "chart_repositories_ids": [
            "00000000-0000-0000-0000-000000000003"
        ]
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": [{
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Chart",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "00000000-0000-0000-0000-000000000001",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "00000000-0000-0000-0000-000000000002",
                    "name": "Repo2",
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
    'Facets: true Text: kw1 Repo: inexistent | No packages expected - Facets expected'
);
select is(
    search_packages('{
        "facets": false,
        "text": "kw1",
        "package_kinds": [1, 2]
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
    'Facets: false Text: kw1 Kinds: 1, 2 | No packages or facets expected'
);

-- Tests with limit and offset
select is(
    search_packages('{
        "limit": 2,
        "offset": 0,
        "text": "kw1"
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package1",
                "image_id": "00000000-0000-0000-0000-000000000001",
                "package_id": "00000000-0000-0000-0000-000000000001",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 1",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1"
                }
            }, {
                "kind": 0,
                "name": "package2",
                "image_id": "00000000-0000-0000-0000-000000000002",
                "package_id": "00000000-0000-0000-0000-000000000002",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 2",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2"
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
    'Limit: 2 Offset: 0 Text: kw1 | Packages 1 and 2 expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 0,
        "text": "kw1"
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package1",
                "image_id": "00000000-0000-0000-0000-000000000001",
                "package_id": "00000000-0000-0000-0000-000000000001",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 1",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000001",
                    "name": "repo1",
                    "display_name": "Repo 1"
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
    'Limit: 1 Offset: 0 Text: kw1 | Package 1 expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 2,
        "text": "kw1"
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
    'Limit: 1 Offset: 2 Text: kw1 | No packages expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 1,
        "text": "kw1"
    }')::jsonb,
    '{
        "data": {
            "packages": [{
                "kind": 0,
                "name": "package2",
                "image_id": "00000000-0000-0000-0000-000000000002",
                "package_id": "00000000-0000-0000-0000-000000000002",
                "app_version": "12.1.0",
                "description": "description",
                "display_name": "Package 2",
                "chart_repository": {
                    "chart_repository_id": "00000000-0000-0000-0000-000000000002",
                    "name": "repo2",
                    "display_name": "Repo 2"
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
    'Limit: 1 Offset: 1 Text: kw1 | Package 2 expected'
);
select is(
    search_packages('{
        "limit": 0,
        "offset": 0,
        "text": "kw1"
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
    'Limit: 0 Offset: 0 Text: kw1 | No packages expected'
);
select is(
    search_packages('{
        "limit": 1,
        "offset": 2,
        "facets": true,
        "text": "kw1"
    }')::jsonb,
    '{
        "data": {
            "packages": [],
            "facets": [{
                "title": "Kind",
                "filter_key": "kind",
                "options": [{
                    "id": 0,
                    "name": "Chart",
                    "total": 2
                }]
            }, {
                "title": "Repository",
                "filter_key": "repo",
                "options": [{
                    "id": "00000000-0000-0000-0000-000000000001",
                    "name": "Repo1",
                    "total": 1
                }, {
                    "id": "00000000-0000-0000-0000-000000000002",
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
    'Limit: 1 Offset: 2 Text: kw1 | No packages expected - Facets expected'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
