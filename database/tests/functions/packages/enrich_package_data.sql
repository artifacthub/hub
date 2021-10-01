-- Start transaction and plan tests
begin;
select plan(5);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

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

-- Run some tests
select is(
    enrich_package_data(1,
    '{
        "dependencies": [{
            "name": "pkg1",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }'),
    '{
        "dependencies": [{
            "name": "pkg1",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }'
);
select is(
    enrich_package_data(0,
    '{
        "dependencies": [{
            "name": "pkg1",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }'),
    '{
        "dependencies": [{
            "name": "pkg1",
            "version": "1.0.0",
            "repository": "https://repo1.url",
            "artifacthub_repository_name": "repo1"
        }]
    }'
);
select is(
    enrich_package_data(0,
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo2.url"
        }]
    }'),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo2.url"
        }]
    }'
);
select is(
    enrich_package_data(0,
    '{
        "dependencies": [{
            "name": "pkg1",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }, {
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo2.url"
        }]
    }'),
    '{
        "dependencies": [{
            "name": "pkg1",
            "version": "1.0.0",
            "repository": "https://repo1.url",
            "artifacthub_repository_name": "repo1"
        }, {
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo2.url"
        }]
    }'
);
select is(
    enrich_package_data(0,
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }, {
            "name": "pkg3",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }'),
    '{
        "dependencies": [{
            "name": "pkg2",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }, {
            "name": "pkg3",
            "version": "1.0.0",
            "repository": "https://repo1.url"
        }]
    }'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
