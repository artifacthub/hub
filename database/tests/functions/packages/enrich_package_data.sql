-- Start transaction and plan tests
begin;
select plan(6);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.url', 0, :'org1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'pkg1',
    '1.0.0',
    :'repo1ID'
);
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package2ID',
    'pkg2',
    '1.0.0',
    :'repo1ID'
);

-- Run some tests
select is(
    enrich_package_data(
        :'package1ID',
        1,
        '{
            "dependencies": [{
                "name": "pkg2",
                "version": "1.0.0",
                "repository": "https://repo1.url"
            }]
        }'
    ),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }',
    'only data for packages of kind helm are enriched at the moment'
);
select is(
    enrich_package_data(
        :'package1ID',
        0,
        '{
            "dependencies": [{
                "name": "pkg2",
                "version": "1.0.0",
                "repository": "https://repo1.url/"
            }]
        }'
    ),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo1.url/",
            "artifacthub_repository_name": "repo1"
        }]
    }',
    'ah repo name expected for dependency pkg2'
);
select is(
    enrich_package_data(
        :'package1ID',
        0,
        '{
            "dependencies": [{
                "name": "pkg2",
                "version": "1.0.0",
                "repository": "https://repo2.url"
            }]
        }'
    ),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo2.url"
        }]
    }',
    'ah repo name not expected for dependency pkg2 as url does not match'
);
select is(
    enrich_package_data(
        :'package1ID',
        0,
        '{
            "dependencies": [{
                "name": "pkg2",
                "version": "1.0.0",
                "repository": "https://repo1.url"
            }, {
                "name": "pkg3",
                "version": "1.0.0",
                "repository": "https://repo2.url"
            }]
        }'
    ),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo1.url",
            "artifacthub_repository_name": "repo1"
        }, {
            "name": "pkg3",
            "version": "1.0.0",
            "repository": "https://repo2.url"
        }]
    }',
    'ah repo name expected for dep pkg2, not for pkg3'
);
select is(
    enrich_package_data(
        :'package1ID',
        0,
        '{
            "dependencies": [{
                "name": "pkg3",
                "version": "1.0.0",
                "repository": "https://repo1.url"
            }, {
                "name": "pkg4",
                "version": "1.0.0",
                "repository": "https://repo1.url"
            }]
        }'
    ),
    '{
        "dependencies": [{
            "name": "pkg3",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }, {
            "name": "pkg4",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }',
    'ah repo name not expected for dep pkg3 or pkg4'
);
select is(
    enrich_package_data(
        :'package1ID',
        0,
        '{
            "dependencies": [{
                "name": "pkg2",
                "version": "1.0.0",
                "repository": "file://../pkg2"
            }]
        }'
    ),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "file://../pkg2",
            "artifacthub_repository_name": "repo1"
        }]
    }',
    'ah repo name expected for dep pkg2 (using file url)'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
