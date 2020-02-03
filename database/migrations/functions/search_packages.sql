-- search_packages searchs packages in the database that match the criteria in
-- the query provided.
create or replace function search_packages(p_query jsonb)
returns setof json as $$
begin
    if not p_query ? 'text' or p_query->>'text' = '' then
        raise 'invalid query text';
    end if;

    return query
    with packages_found as (
        select
            p.package_id,
            p.package_kind_id,
            pk.name as package_kind_name,
            p.name,
            p.display_name,
            p.description,
            p.logo_url,
            s.app_version,
            r.chart_repository_id as chart_repository_id,
            r.name as chart_repository_name,
            r.display_name as chart_repository_display_name
        from package p
        join package_kind pk using (package_kind_id)
        join chart_repository r using (chart_repository_id)
        join snapshot s using (package_id)
        where websearch_to_tsquery(p_query->>'text') @@ p.tsdoc
        and p.latest_version = s.version
    )
    select json_build_object(
        'packages', (
            select coalesce(json_agg(json_build_object(
                'package_id', package_id,
                'kind', package_kind_id,
                'name', name,
                'display_name', display_name,
                'description', description,
                'logo_url', logo_url,
                'app_version', app_version,
                'chart_repository', (
                    select json_build_object(
                        'name', chart_repository_name,
                        'display_name', chart_repository_display_name
                    )
                )
            )), '[]')
            from packages_found
        ),
        'facets', (
            select json_build_array(
                (
                    select json_build_object(
                        'title', 'Kind',
                        'options', (
                            select coalesce(json_agg(json_build_object(
                                'id', package_kind_id,
                                'name', initcap(package_kind_name),
                                'total', total
                            )), '[]')
                            from (
                                select package_kind_id, package_kind_name, count(*) as total
                                from packages_found
                                group by package_kind_id, package_kind_name
                                order by total desc
                            ) as breakdown
                        )
                    )
                ),
                (
                    select json_build_object(
                        'title', 'Repository',
                        'options', (
                            select coalesce(json_agg(json_build_object(
                                'id', chart_repository_id,
                                'name', initcap(chart_repository_name),
                                'total', total
                            )), '[]')
                            from (
                                select chart_repository_id, chart_repository_name, count(*) as total
                                from packages_found
                                group by chart_repository_id, chart_repository_name
                                order by total desc
                            ) as breakdown
                        )
                    )
                )
            )
        )
    );
end
$$ language plpgsql;
