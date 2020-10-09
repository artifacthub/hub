-- update_snapshot_security_report updates the security report of the package's
-- snapshot provides.
create or replace function update_snapshot_security_report(p_report jsonb)
returns void as $$
    update snapshot set
        security_report = p_report->'full',
        security_report_summary = p_report->'summary',
        security_report_created_at = current_timestamp
    where package_id = (p_report->>'package_id')::uuid
    and version = p_report->>'version';
$$ language sql;
