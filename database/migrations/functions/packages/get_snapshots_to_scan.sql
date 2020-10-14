-- get_snapshots_to_scan returns the snapshots to scan for security
-- vulnerabilities as a json array.
create or replace function get_snapshots_to_scan()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'package_id', package_id,
        'version', version,
        'containers_images', containers_images
    )), '[]')
    from snapshot
    where security_report is null
    or security_report_created_at < (current_timestamp - '1 week'::interval);
$$ language sql;
