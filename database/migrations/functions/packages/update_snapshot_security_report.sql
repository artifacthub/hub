-- update_snapshot_security_report updates the security report of the package's
-- snapshot provides.
create or replace function update_snapshot_security_report(p_report jsonb)
returns void as $$
declare
    v_package_id uuid := (p_report->>'package_id')::uuid;
    v_version text := p_report->>'version';
    v_alert_digest text := nullif(p_report->>'alert_digest', '');
    v_previous_alert_digest text;
begin
    -- Register security alert event for the associated package if the package's
    -- version is the latest and the security report's alert digest has changed
    select security_report_alert_digest
    from snapshot s
    join package p using (package_id)
    where package_id = v_package_id
    and s.version = v_version
    and s.version = p.latest_version
    into v_previous_alert_digest;
    if found then
        if v_alert_digest is not null
        and (v_previous_alert_digest is null or v_alert_digest <> v_previous_alert_digest) then
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
