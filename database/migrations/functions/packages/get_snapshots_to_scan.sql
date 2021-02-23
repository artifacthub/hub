-- get_snapshots_to_scan returns the snapshots to scan for security
-- vulnerabilities as a json array.
create or replace function get_snapshots_to_scan()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', repository_id,
        'package_id', package_id,
        'version', version,
        'containers_images', jsonb_path_query_array(
            containers_images,
            '$[*] ? (!exists(@.whitelisted) || @.whitelisted <> true)'
        )
    )), '[]')
    from (
        select p.repository_id, s.package_id, s.version, s.containers_images
        from snapshot s
        join package p using (package_id)
        join repository r using (repository_id)
        where (security_report is null or security_report_created_at < (current_timestamp - '1 week'::interval))
        and r.scanner_disabled = false
        order by s.created_at desc
    ) s;
$$ language sql;
