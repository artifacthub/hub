-- Start transaction and plan tests
begin;
select plan(5);

-- Declare some variables
\set org1ID '00000000-0000-0000-0000-000000000001'
\set org2ID '00000000-0000-0000-0000-000000000002'
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set repo2ID '00000000-0000-0000-0000-000000000002'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set maintainer1ID '00000000-0000-0000-0000-000000000001'
\set maintainer2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'
\set image3ID '00000000-0000-0000-0000-000000000003'
\set webhook1ID '00000000-0000-0000-0000-000000000001'

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
insert into organization (organization_id, name, display_name, description, home_url, logo_image_id)
values (:'org2ID', 'org2', 'Organization 2', 'Description 2', 'https://org2.com', :'image3ID');
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
    is_operator,
    official,
    cncf,
    channels,
    default_channel,
    package_category_id,
    repository_id
) values (
    :'package1ID',
    'Package 1',
    '1.0.0',
    true,
    true,
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
    1,
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
    logo_image_id,
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
    signatures,
    content_url,
    containers_images,
    provider,
    values_schema,
    changes,
    contains_security_updates,
    prerelease,
    recommendations,
    screenshots,
    sign_key,
    relative_path,
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
    '{"prov","cosign"}',
    'https://content.url/pkg1.tgz',
    '[{"image": "quay.io/org/img:1.0.0", "whitelisted": true}]',
    'Org Inc',
    '{"key": "value"}',
    '[
        {
            "kind": "added",
            "description": "feature 1",
            "links": [{"name": "github issue", "url": "https://issue.url"}]
        }
    ]',
    true,
    true,
    '[{"url": "https://artifacthub.io/packages/helm/artifact-hub/artifact-hub"}]',
    '[
        {
            "title": "Screenshot 1",
            "url": "https://artifacthub.io/screenshot1.jpg"
        }
    ]'::jsonb,
    '{"fingerprint": "0011223344", "url": "https://key.url"}',
    'path1/path2',
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
    install,
    links,
    capabilities,
    data,
    values_schema,
    contains_security_updates,
    prerelease,
    ts
) values (
    :'package1ID',
    '0.0.9',
    'Package 1 (older)',
    'description (older)',
    :'image1ID',
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
    repository_id
) values (
    :'package2ID',
    'package2',
    '1.0.0',
    :'repo2ID'
);
insert into snapshot (
    package_id,
    version,
    display_name,
    description,
    logo_image_id,
    keywords,
    readme,
    install,
    data,
    ts
) values (
    :'package2ID',
    '1.0.0',
    'Package 2',
    'description',
    :'image2ID',
    '{"kw1", "kw2"}',
    'readme-version-1.0.0',
    'install-version-1.0.0',
    '{"key": "value"}',
    '2020-06-16 11:20:34+02'
);
insert into subscription (user_id, package_id, event_kind_id)
values (:'user1ID', :'package1ID', 0);
insert into webhook (webhook_id, name, url, user_id)
values (:'webhook1ID', 'webhook1', 'http://webhook1.url', :'user1ID');
insert into webhook__event_kind (webhook_id, event_kind_id) values (:'webhook1ID', 0);
insert into webhook__package (webhook_id, package_id) values (:'webhook1ID', :'package2ID');
insert into production_usage (package_id, organization_id) values (:'package1ID', :'org2ID');

-- Run some tests
select is(
    get_package('{
        "package_id": "00000000-0000-0000-0000-000000000001"
    }')::jsonb,
    '{
        "package_id": "00000000-0000-0000-0000-000000000001",
        "name": "Package 1",
        "normalized_name": "package-1",
        "category": 1,
        "is_operator": true,
        "official": true,
        "cncf": true,
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
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
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
                "version": "1.0.0",
                "contains_security_updates": true,
                "prerelease": true,
                "ts": 1592299234
            },
            {
                "version": "0.0.9",
                "contains_security_updates": false,
                "prerelease": false,
                "ts": 1592299233
            }
        ],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
        "deprecated": true,
        "contains_security_updates": true,
        "prerelease": true,
        "license": "Apache-2.0",
        "signed": true,
        "signatures": ["prov", "cosign"],
        "content_url": "https://content.url/pkg1.tgz",
        "containers_images": [
            {
                "image": "quay.io/org/img:1.0.0",
                "whitelisted": true
            }
        ],
        "all_containers_images_whitelisted": true,
        "provider": "Org Inc",
        "has_values_schema": true,
        "has_changelog": true,
        "changes": [
            {
                "kind": "added",
                "description": "feature 1",
                "links": [
                    {
                        "name": "github issue",
                        "url": "https://issue.url"
                    }
                ]
            }
        ],
        "ts": 1592299234,
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
        "screenshots": [
            {
                "title": "Screenshot 1",
                "url": "https://artifacthub.io/screenshot1.jpg"
            }
        ],
        "sign_key": {
            "fingerprint": "0011223344",
            "url": "https://key.url"
        },
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
            "user_alias": "user1"
        },
        "stats": {
            "subscriptions": 1,
            "webhooks": 0
        },
        "production_organizations_count": 1,
        "relative_path": "path1/path2"
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
        "category": 1,
        "is_operator": true,
        "official": true,
        "cncf": true,
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
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
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
                "version": "1.0.0",
                "contains_security_updates": true,
                "prerelease": true,
                "ts": 1592299234
            },
            {
                "version": "0.0.9",
                "contains_security_updates": false,
                "prerelease": false,
                "ts": 1592299233
            }
        ],
        "app_version": "12.1.0",
        "digest": "digest-package1-1.0.0",
        "deprecated": true,
        "contains_security_updates": true,
        "prerelease": true,
        "license": "Apache-2.0",
        "signed": true,
        "signatures": ["prov", "cosign"],
        "content_url": "https://content.url/pkg1.tgz",
        "containers_images": [
            {
                "image": "quay.io/org/img:1.0.0",
                "whitelisted": true
            }
        ],
        "all_containers_images_whitelisted": true,
        "provider": "Org Inc",
        "has_values_schema": true,
        "has_changelog": true,
        "changes": [
            {
                "kind": "added",
                "description": "feature 1",
                "links": [
                    {
                        "name": "github issue",
                        "url": "https://issue.url"
                    }
                ]
            }
        ],
        "ts": 1592299234,
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
        "screenshots": [
            {
                "title": "Screenshot 1",
                "url": "https://artifacthub.io/screenshot1.jpg"
            }
        ],
        "sign_key": {
            "fingerprint": "0011223344",
            "url": "https://key.url"
        },
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
            "user_alias": "user1"
        },
        "stats": {
            "subscriptions": 1,
            "webhooks": 0
        },
        "production_organizations_count": 1,
        "relative_path": "path1/path2"
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
        "category": 1,
        "is_operator": true,
        "official": true,
        "cncf": true,
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
        "logo_image_id": "00000000-0000-0000-0000-000000000001",
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
                "version": "1.0.0",
                "contains_security_updates": true,
                "prerelease": true,
                "ts": 1592299234
            },
            {
                "version": "0.0.9",
                "contains_security_updates": false,
                "prerelease": false,
                "ts": 1592299233
            }
        ],
        "app_version": "12.0.0",
        "digest": "digest-package1-0.0.9",
        "contains_security_updates": false,
        "prerelease": false,
        "has_values_schema": false,
        "has_changelog": true,
        "ts": 1592299233,
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
            "scanner_disabled": false,
            "user_alias": "user1"
        },
        "stats": {
            "subscriptions": 1,
            "webhooks": 0
        },
        "production_organizations_count": 1
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
        "display_name": "Package 2",
        "description": "description",
        "logo_image_id": "00000000-0000-0000-0000-000000000002",
        "keywords": ["kw1", "kw2"],
        "readme": "readme-version-1.0.0",
        "install": "install-version-1.0.0",
        "data": {
            "key": "value"
        },
        "has_values_schema": false,
        "has_changelog": false,
        "ts": 1592299234,
        "version": "1.0.0",
        "available_versions": [
            {
                "version": "1.0.0",
                "ts": 1592299234
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
            "scanner_disabled": false,
            "organization_name": "org1",
            "organization_display_name": "Organization 1"
        },
        "stats": {
            "subscriptions": 0,
            "webhooks": 1
        },
        "production_organizations_count": 0
    }'::jsonb,
    'Last package2 version is returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
