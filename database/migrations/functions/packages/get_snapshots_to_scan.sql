-- get_snapshots_to_scan returns the snapshots to scan for security
-- vulnerabilities as a json array.
create or replace function get_snapshots_to_scan()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', repository_id,
        'package_id', package_id,
        'package_name', package_name,
        'version', version,
        'containers_images', jsonb_path_query_array(
            containers_images,
            '$[*] ? (!exists(@.whitelisted) || @.whitelisted <> true)'
        )
    )), '[]')
    from (
        select
            p.repository_id,
            s.package_id,
            p.name as package_name,
            s.version,
            s.containers_images
        from snapshot s
        join package p using (package_id)
        join repository r using (repository_id)
        where s.containers_images is not null
        and jsonb_array_length(s.containers_images) <= 15
        and r.scanner_disabled = false
        and s.ts > (current_timestamp - '1 year'::interval)
        and (
            security_report is null
            or (security_report_created_at < (current_timestamp - '1 day'::interval) and s.version = p.latest_version)
            or security_report_created_at < (current_timestamp - '1 week'::interval)
        )
        and r.repository_kind_id <> 13 -- Kubewarden policies are excluded for now
        and r.repository_kind_id <> 22 -- Inspektor gadgets are excluded for now
        order by s.created_at desc
    ) s;
$$ language sql;
