-- Start transaction and plan tests
begin;
select plan(5);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set maintainer1ID '00000000-0000-0000-0000-000000000001'
\set maintainer2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- No packages at this point
select is_empty(
    $$
        select get_package('{
            "package_name": "package1",
            "repository_name": "repo1"
        }')
    $$,
    'If package requested does not exist no rows are returned'
);

-- Seed some data
insert into organization (organization_id, name, display_name, description, home_url)
values (:'org1ID', 'org1', 'Organization 1', 'Description 1', 'https://org1.com');
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into repository (repository_id, name, display_name, url, repository_kind_id, organization_id)
values (:'repo2ID', 'repo2', 'Repo 2', 'https://repo2.com', 0, :'org1ID');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer1ID', 'name1', 'email1');
insert into maintainer (maintainer_id, name, email)
values (:'maintainer2ID', 'name2', 'email2');
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    is_operator,
    channels,
    default_channel,
    repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    :'image1ID',
    true,
    '[
        {
            "name": "stable",
            "version": "1.0.0"
        },
        {
            "name": "alpha",
            "version": "1.1.0"
        }
    ]'::jsonb,
    'stable',
    :'repo1ID'
);
insert into package__maintainer (package_id, maintainer_id)
values (:'package1ID', :'maintainer1ID');
insert into package__maintainer (package_id, maintainer_id)
values (:'package1ID', :'maintainer2ID');
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
    install,
    links,
    crds,
    crds_examples,
    capabilities,
    security_report_summary,
    security_report_created_at,
    data,
    deprecated,
    license,
    signed,
    content_url,
    containers_images,
    provider,
    values_schema,
    changes,
    contains_security_updates,
    prerelease,
    recommendations,
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
    'readme-version-1.0.0',
    'install-version-1.0.0',
    '[{"name": "link1", "url": "https://link1"}, {"name": "link2", "url": "https://link2"}]',
    '[{"key": "value"}]',
    '[{"key": "value"}]',
    'seamless upgrades',
    '{"high": 2, "medium": 1}',
    '2020-06-16 11:20:34+02',
    '{"key": "value"}',
    true,
    'Apache-2.0',
    true,
    'https://content.url/pkg1.tgz',
    '[{"image": "quay.io/org/img:1.0.0"}]',
    'Org Inc',
    '{"key": "value"}',
    '{"feature 1", "fix 1"}',
    true,
    true,
    '[{"url": "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub"}]',
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
    install,
    links,
    capabilities,
    data,
    values_schema,
    contains_security_updates,
    prerelease,
    created_at
) values (
    :'package1ID',
    '0.0.9',
    'Package 1 (older)',
    'description (older)',
    '{"kw1", "kw2", "older"}',
    'home_url (older)',
    '12.0.0',
    'digest-package1-0.0.9',
    'readme-version-0.0.9',
    'install-version-0.0.9',
    '[{"name": "link1", "url": "https://link1"}, {"name": "link2", "url": "https://link2"}]',
    'basic install',
    '{"key": "value"}',
    '{}',
    false,
    false,
    '2020-06-16 11:20:33+02'
);
insert into package (
    package_id,
    name,
    latest_version,
    logo_image_id,
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'image2ID',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    keywords,
    readme,
    install,
    data,
    created_at
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    '{"kw1", "kw2"}',
    'readme-version-1.0.0',
    'install-version-1.0.0',
    '{"key": "value"}',
    '2020-06-16 11:20:34+02'
);

-- Run some tests
select is(
    get_package('{
        "package_id": "00000000-0000-0000-0000-000000000001"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "is_operator": true,
        "channels": [
            {
                "name": "stable",
                "version": "1.0.0"
            },
            {
                "name": "alpha",
                "version": "1.1.0"
            }
        ],
        "default_channel": "stable",
        "display_name": "Package 1",
        "description": "description",
        "keywords": ["kw1", "kw2"],
        "home_url": "home_url",
        "readme": "readme-version-1.0.0",
        "install": "install-version-1.0.0",
        "links": [
            {
                "name": "link1",
                "url": "https://link1"
            },
            {
                "name": "link2",
                "url": "https://link2"
            }
        ],
        "crds": [{
            "key": "value"
        }],
        "crds_examples": [{
            "key": "value"
        }],
        "capabilities": "seamless upgrades",
        "security_report_summary": {
            "high": 2,
            "medium": 1
        },
        "security_report_created_at": 1592299234,
        "data": {
            "key": "value"
        },
        "version": "1.0.0",
        "available_versions": [
            {
                "version": "0.0.9",
                "contains_security_updates": false,
                "prerelease": false,
                "created_at": 1592299233
            },
            {
                "version": "1.0.0",
                "contains_security_updates": true,
                "prerelease": true,
                "created_at": 1592299234
            }
        ],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
        "deprecated": true,
        "contains_security_updates": true,
        "prerelease": true,
        "license": "Apache-2.0",
        "signed": true,
        "content_url": "https://content.url/pkg1.tgz",
        "containers_images": [
            {
                "image": "quay.io/org/img:1.0.0"
            }
        ],
        "provider": "Org Inc",
        "has_values_schema": true,
        "has_changelog": true,
        "changes": [
            "feature 1",
            "fix 1"
        ],
        "created_at": 1592299234,
        "maintainers": [
            {
                "name": "name1",
                "email": "email1"
            },
            {
                "name": "name2",
                "email": "email2"
            }
        ],
        "recommendations": [
            {
                "url": "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub"
            }
        ],
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "user_alias": "user1"
        }
    }'::jsonb,
    'Last package1 version is returned as a json object'
);
select is(
    get_package('{
        "package_name": "package-1",
        "repository_name": "repo1"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "is_operator": true,
        "channels": [
            {
                "name": "stable",
                "version": "1.0.0"
            },
            {
                "name": "alpha",
                "version": "1.1.0"
            }
        ],
        "default_channel": "stable",
        "display_name": "Package 1",
        "description": "description",
        "keywords": ["kw1", "kw2"],
        "home_url": "home_url",
        "readme": "readme-version-1.0.0",
        "install": "install-version-1.0.0",
        "links": [
            {
                "name": "link1",
                "url": "https://link1"
            },
            {
                "name": "link2",
                "url": "https://link2"
            }
        ],
        "crds": [{
            "key": "value"
        }],
        "crds_examples": [{
            "key": "value"
        }],
        "capabilities": "seamless upgrades",
        "security_report_summary": {
            "high": 2,
            "medium": 1
        },
        "security_report_created_at": 1592299234,
        "data": {
            "key": "value"
        },
        "version": "1.0.0",
        "available_versions": [
            {
                "version": "0.0.9",
                "contains_security_updates": false,
                "prerelease": false,
                "created_at": 1592299233
            },
            {
                "version": "1.0.0",
                "contains_security_updates": true,
                "prerelease": true,
                "created_at": 1592299234
            }
        ],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
        "deprecated": true,
        "contains_security_updates": true,
        "prerelease": true,
        "license": "Apache-2.0",
        "signed": true,
        "content_url": "https://content.url/pkg1.tgz",
        "containers_images": [
            {
                "image": "quay.io/org/img:1.0.0"
            }
        ],
        "provider": "Org Inc",
        "has_values_schema": true,
        "has_changelog": true,
        "changes": [
            "feature 1",
            "fix 1"
        ],
        "created_at": 1592299234,
        "maintainers": [
            {
                "name": "name1",
                "email": "email1"
            },
            {
                "name": "name2",
                "email": "email2"
            }
        ],
        "recommendations": [
            {
                "url": "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub"
            }
        ],
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "user_alias": "user1"
        }
    }'::jsonb,
    'Last package1 version is returned as a json object'
);
select is(
    get_package('{
        "package_name": "package-1",
        "repository_name": "repo1",
        "version": "0.0.9"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "Package 1",
        "normalized_name": "package-1",
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
        "is_operator": true,
        "channels": [
            {
                "name": "stable",
                "version": "1.0.0"
            },
            {
                "name": "alpha",
                "version": "1.1.0"
            }
        ],
        "default_channel": "stable",
        "display_name": "Package 1 (older)",
        "description": "description (older)",
        "keywords": ["kw1", "kw2", "older"],
        "home_url": "home_url (older)",
        "readme": "readme-version-0.0.9",
        "install": "install-version-0.0.9",
        "links": [
            {
                "name": "link1",
                "url": "https://link1"
            },
            {
                "name": "link2",
                "url": "https://link2"
            }
        ],
        "capabilities": "basic install",
        "data": {
            "key": "value"
        },
        "version": "0.0.9",
        "available_versions": [
            {
                "version": "0.0.9",
                "contains_security_updates": false,
                "prerelease": false,
                "created_at": 1592299233
            },
            {
                "version": "1.0.0",
                "contains_security_updates": true,
                "prerelease": true,
                "created_at": 1592299234
            }
        ],
        "app_version": "12.0.0",
        "digest": "digest-package1-0.0.9",
        "contains_security_updates": false,
        "prerelease": false,
        "has_values_schema": false,
        "has_changelog": true,
        "created_at": 1592299233,
        "maintainers": [
            {
                "name": "name1",
                "email": "email1"
            },
            {
                "name": "name2",
                "email": "email2"
            }
        ],
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000001",
            "kind": 0,
            "name": "repo1",
            "display_name": "Repo 1",
            "url": "https://repo1.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "user_alias": "user1"
        }
    }'::jsonb,
    'Requested package version is returned as a json object'
);
select is(
    get_package('{
        "package_name": "package2",
        "repository_name": "repo2"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000002",
        "name": "package2",
        "normalized_name": "package2",
        "logo_image_id": "00000000-0000-0000-0000-000000000002",
        "display_name": "Package 2",
        "description": "description",
        "keywords": ["kw1", "kw2"],
        "readme": "readme-version-1.0.0",
        "install": "install-version-1.0.0",
        "data": {
            "key": "value"
        },
        "has_values_schema": false,
        "has_changelog": false,
        "created_at": 1592299234,
        "version": "1.0.0",
        "available_versions": [
            {
                "version": "1.0.0",
                "created_at": 1592299234
            }
        ],
        "repository": {
            "repository_id": "00000000-0000-0000-0000-000000000002",
            "kind": 0,
            "name": "repo2",
            "display_name": "Repo 2",
            "url": "https://repo2.com",
            "private": false,
            "verified_publisher": false,
            "official": false,
            "organization_name": "org1",
            "organization_display_name": "Organization 1"
        }
    }'::jsonb,
    'Last package2 version is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
