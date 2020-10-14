-- Start transaction and plan tests
begin;
select plan(6);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'

-- Seed some data
insert into "user" (user_id, alias, email) values (:'user1ID', 'user1', 'user1@email.com');
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
    containers_images
) values (
    :'package1ID',
    '1.0.0',
    '[{"image": "quay.io/org/pkg1:1.0.0"}]'
);

-- Run some tests
select is(security_report, null, 'Security report should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_created_at, null, 'Security report created at should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_summary, null, 'Security report summary should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000001",
    "version": "1.0.0",
    "summary": {
        "critical": 2,
        "high": 3,
        "low": 10
    },
    "full": {
        "quay.io/org/pkg1:1.0.0": [
            {"k": "v"}
        ]
    }
}');
select is(security_report, '{
    "quay.io/org/pkg1:1.0.0": [
            {"k": "v"}
    ]
}', 'Security report should exist')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select isnt(security_report_created_at, null, 'Security report created at should exist')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_summary, '{
    "critical": 2,
    "high": 3,
    "low": 10
}', 'Security report summary should exist')
from snapshot where package_id = :'package1ID' and version = '1.0.0';

-- Finish tests and rollback transaction
select * from finish();
rollback;
