-- update_snapshot_security_report updates the security report of the package's
-- snapshot provides.
create or replace function update_snapshot_security_report(
    p_report jsonb,
    p_emit_alert boolean
)
returns void as $$
declare
    v_package_id uuid := (p_report->>'package_id')::uuid;
    v_version text := p_report->>'version';
    v_alert_digest text := nullif(p_report->>'alert_digest', '');
begin
    -- Register a security alert event when the caller indicates it should be
    -- emitted and the scanned version is still the latest
    if p_emit_alert and v_alert_digest is not null then
        if exists (
            select 1
            from snapshot s
            join package p using (package_id)
            where package_id = v_package_id
            and s.version = v_version
            and s.version = p.latest_version
        ) then
            insert into event (package_id, package_version, event_kind_id)
            values (v_package_id, v_version, 1);
        end if;
    end if;

    -- Update security report info in snapshot
    update snapshot set
        security_report = p_report->'images_reports',
        security_report_alert_digest = v_alert_digest,
        security_report_summary = p_report->'summary',
        security_report_created_at = current_timestamp
    where package_id = v_package_id
    and version = v_version;
end
$$ language plpgsql;
