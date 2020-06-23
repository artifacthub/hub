-- Start transaction and plan tests
begin;
select plan(2);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'
\set image1ID '00000000-0000-0000-0000-000000000001'
\set image2ID '00000000-0000-0000-0000-000000000002'

-- No packages at this point
select is(
    get_repository_packages_digest(:'repo1ID'::uuid)::jsonb,
    '{}'::jsonb,
    'With no repositories/packages an empty json object is returned'
);

-- Seed some data
insert into "user" (user_id, alias, email)
values (:'user1ID', 'user1', 'user1@email.com');
insert into repository (repository_id, name, display_name, url, repository_kind_id, user_id)
values (:'repo1ID', 'repo1', 'Repo 1', 'https://repo1.com', 0, :'user1ID');
insert into package (
    package_id,
    name,
    latest_version,
    repository_id
) values (
    :'package1ID',
    'package1',
    '1.0.0',
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    digest
) values (
    :'package1ID',
    '1.0.0',
    'digest-package1-1.0.0'
);
insert into snapshot (
    package_id,
    version,
    digest
) values (
    :'package1ID',
    '0.0.9',
    'digest-package1-0.0.9'
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
    :'repo1ID'
);
insert into snapshot (
    package_id,
    version,
    digest
) values (
    :'package2ID',
    '1.0.0',
    'digest-package2-1.0.0'
);
insert into snapshot (
    package_id,
    version,
    digest
) values (
    :'package2ID',
    '0.0.9',
    'digest-package2-0.0.9'
);

-- Some packages have just been seeded
select is(
    get_repository_packages_digest(:'repo1ID'::uuid)::jsonb,
    '{
        "package1@1.0.0": "digest-package1-1.0.0",
        "package1@0.0.9": "digest-package1-0.0.9",
        "package2@1.0.0": "digest-package2-1.0.0",
        "package2@0.0.9": "digest-package2-0.0.9"
    }'::jsonb,
    'Repositories packages digest are returned as a json object'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
