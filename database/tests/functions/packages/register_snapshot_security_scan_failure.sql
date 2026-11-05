-- Start transaction and plan tests
begin;
select plan(14);

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
    security_report,
    security_report_alert_digest,
    security_report_summary,
    security_report_created_at
) values (
    :'package1ID',
    '1.0.0',
    '{"quay.io/org/pkg1:1.0.0": [{"k": "v"}]}',
    'digest',
    '{"critical": 2, "high": 3}',
    '2020-01-01 00:00:00+00'
);
insert into snapshot (
    package_id,
    version
) values (
    :'package1ID',
    '0.0.9'
);
insert into snapshot (
    package_id,
    version,
    security_report_created_at
) values (
    :'package1ID',
    '0.0.8',
    '2020-01-01 00:00:00+00'
);

-- Scan failure on a snapshot with a previous security report
select register_snapshot_security_scan_failure(:'package1ID', '1.0.0');
select is(
    security_report,
    '{"quay.io/org/pkg1:1.0.0": [{"k": "v"}]}',
    'Security report should be kept'
)
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_report_alert_digest, 'digest', 'Security report alert digest should be kept')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(
    security_report_summary,
    '{"critical": 2, "high": 3}',
    'Security report summary should be kept'
)
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(
    security_report_created_at,
    '2020-01-01 00:00:00+00',
    'Security report created at should be kept'
)
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is(security_scan_attempted_at, current_timestamp, 'Security scan attempted at should be set')
from snapshot where package_id = :'package1ID' and version = '1.0.0';
select is_empty(
    $$ select * from event $$,
    'No security alert event should be registered'
);

-- Scan failure on a snapshot without a previous security report
select register_snapshot_security_scan_failure(:'package1ID', '0.0.9');
select is(security_report, null, 'Security report should still be null')
from snapshot where package_id = :'package1ID' and version = '0.0.9';
select is(security_report_alert_digest, null, 'Security report alert digest should still be null')
from snapshot where package_id = :'package1ID' and version = '0.0.9';
select is(security_report_summary, null, 'Security report summary should still be null')
from snapshot where package_id = :'package1ID' and version = '0.0.9';
select is(security_report_created_at, null, 'Security report created at should still be null')
from snapshot where package_id = :'package1ID' and version = '0.0.9';
select is(security_scan_attempted_at, current_timestamp, 'Security scan attempted at should be set')
from snapshot where package_id = :'package1ID' and version = '0.0.9';

-- Other snapshots of the package should not be updated
select is(security_report, null, 'Security report of other snapshots should not be updated')
from snapshot where package_id = :'package1ID' and version = '0.0.8';
select is(
    security_report_created_at,
    '2020-01-01 00:00:00+00',
    'Security report created at of other snapshots should not be updated'
)
from snapshot where package_id = :'package1ID' and version = '0.0.8';
select is(
    security_scan_attempted_at,
    null,
    'Security scan attempted at of other snapshots should not be updated'
)
from snapshot where package_id = :'package1ID' and version = '0.0.8';

-- Finish tests and rollback transaction
select * from finish();
rollback;
