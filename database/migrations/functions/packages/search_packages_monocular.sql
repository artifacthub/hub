-- search_packages_monocular searches packages in the database that match the
-- criteria in the query provided, returning results in a format that is
-- compatible with the Monocular search API.
create or replace function search_packages_monocular(p_base_url text, p_tsquery_web text)
returns setof json as $$
declare
    v_tsquery_web tsquery := websearch_to_tsquery(p_tsquery_web);
begin
    return query
    with packages_found as (
        select
            p.normalized_name as package_name,
            s.description,
            s.version,
            s.app_version,
            r.name as repository_name,
            r.url as repository_url,
            (case when p_tsquery_web <> '' then
                ts_rank(ts_filter(tsdoc, '{a}'), v_tsquery_web, 1) +
                ts_rank('{0.1, 0.2, 0.2, 1.0}', ts_filter(tsdoc, '{b,c}'), v_tsquery_web)
            else 1 end) as rank
        from package p
        join snapshot s using (package_id)
        join repository r using (repository_id)
        where r.repository_kind_id = 0 -- Helm
        and s.version = p.latest_version
        and (s.deprecated is null or s.deprecated = false)
        and
            case when p_tsquery_web <> '' then
                v_tsquery_web @@ p.tsdoc
            else true end
        order by rank desc, package_name asc
    )
    select json_strip_nulls(json_build_object(
        'data', (
            select coalesce(json_agg(json_build_object(
                'id', format('%s/%s', repository_name, package_name),
                'artifactHub', json_build_object(
                    'packageUrl', format(
                        '%s/packages/helm/%s/%s',
                        p_base_url,
                        repository_name,
                        package_name
                    )
                ),
                'attributes', json_build_object(
                    'description', description,
                    'repo', json_build_object(
                        'name', repository_name,
                        'url', repository_url
                    )
                ),
                'relationships', json_build_object(
                    'latestChartVersion', json_build_object(
                        'data', json_build_object(
                            'version', version,
                            'app_version', app_version
                        )
                    )
                )
            )), '[]')
            from packages_found
        )
    ));
end
$$ language plpgsql;
