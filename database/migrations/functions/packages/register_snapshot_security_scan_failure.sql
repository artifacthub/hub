-- register_snapshot_security_scan_failure registers that the security scan of
-- the package's snapshot provided failed.
create or replace function register_snapshot_security_scan_failure(
    p_package_id uuid,
    p_version text
)
returns void as $$
    -- The current security report, summary, alert digest and creation time are
    -- kept (a stale report is better than none, and a later successful scan
    -- won't alert again about known vulnerabilities). Only the scan attempt
    -- time is updated, so that the snapshot is scanned again following the
    -- usual schedule.
    update snapshot set
        security_scan_attempted_at = current_timestamp
    where package_id = p_package_id
    and version = p_version;
$$ language sql;
