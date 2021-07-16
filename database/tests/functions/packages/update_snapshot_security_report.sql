-- Start transaction and plan tests
begin;
select plan(14);

-- Declare some variables
\set user1ID '00000000-0000-0000-0000-000000000001'
\set repo1ID '00000000-0000-0000-0000-000000000001'
\set package1ID '00000000-0000-0000-0000-000000000001'
\set package2ID '00000000-0000-0000-0000-000000000002'

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
    version
) values (
    :'package2ID',
    '1.0.0'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package2ID',
    '0.0.9'
);

-- Test security report information update
select is(security_report, null, 'Security report should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_alert_digest, null, 'Security report alert digest should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_created_at, null, 'Security report created at should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_summary, null, 'Security report summary should be null')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000001",
    "version": "1.0.0",
    "alert_digest": "digest",
    "summary": {
        "critical": 2,
        "high": 3,
        "low": 10
    },
    "images_reports": {
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
select is(security_report_alert_digest, 'digest', 'Security report alert digest should exist')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select isnt(security_report_created_at, null, 'Security report created at should exist')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_summary, '{
    "critical": 2,
    "high": 3,
    "low": 10
}', 'Security report summary should exist')
from snapshot where package_id = :'package1ID' and version = '1.0.0';

-- Test security alert events
select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000002",
    "version": "0.0.9",
    "alert_digest": "digest-a"
}');
select is(
    count(*)::int,
    0::int,
    'No security alert event should exist for package 2 version 0.0.9 as the version is not the latest'
)
from event e
join package p using (package_id)
where p.name = 'package2' and e.package_version = '0.0.9';

select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000002",
    "version": "1.0.0"
}');
select is(
    count(*)::int,
    0::int,
    'No security alert event should exist for package 2 version 1.0.0 as the alert digest is null'
)
from event e
join package p using (package_id)
where p.name = 'package2' and e.package_version = '0.0.9';

select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000002",
    "version": "1.0.0",
    "alert_digest": "digest-b"
}');
select is(
    count(*)::int,
    1::int,
    'New security alert event should exist for package2 version 1.0.0'
)
from event e
join package p using (package_id)
where p.name = 'package2' and e.package_version = '1.0.0';

select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000002",
    "version": "1.0.0",
    "alert_digest": "digest-b"
}');
select is(
    count(*)::int,
    1::int,
    'No new security alert event should exist for package 2 version 1.0.0 as the alert digest has not changed'
)
from event e
join package p using (package_id)
where p.name = 'package2' and e.package_version = '1.0.0';

insert into snapshot (
    package_id,
    version
) values (
    :'package2ID',
    '1.1.0'
);
update package set latest_version='1.1.0' where name = 'package2';

select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000002",
    "version": "1.1.0",
    "alert_digest": "digest-b"
}');
select is(
    count(*)::int,
    1::int,
    'New security alert event should exist for package2 version 1.1.0 (new latest version, digest-b)'
)
from event e
join package p using (package_id)
where p.name = 'package2' and e.package_version = '1.1.0';

select update_snapshot_security_report('{
    "package_id": "00000000-0000-0000-0000-000000000002",
    "version": "1.1.0",
    "alert_digest": "digest-c"
}');
select is(
    count(*)::int,
    2::int,
    'New security alert event should exist for package2 version 1.1.0 (digest-c)'
)
from event e
join package p using (package_id)
where p.name = 'package2' and e.package_version = '1.1.0';

-- Finish tests and rollback transaction
select * from finish();
rollback;
