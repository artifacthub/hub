-- search_packages searchs packages in the database that match the criteria in
-- the query provided.
create or replace function search_packages(p_query jsonb)
returns setof json as $$
declare
    v_package_kinds int[];
    v_chart_repositories_ids uuid[];
    v_facets boolean := (p_query->>'facets')::boolean;
begin
    if not p_query ? 'text' or p_query->>'text' = '' then
        raise 'invalid query text';
    end if;

    -- Prepare filters for later use
    select array_agg(e::int) into v_package_kinds
    from jsonb_array_elements_text(p_query->'package_kinds') e;
    select array_agg(e::uuid) into v_chart_repositories_ids
    from jsonb_array_elements_text(p_query->'chart_repositories_ids') e;

    return query
    with packages_with_text_filter as (
        select
            p.package_id,
            p.package_kind_id,
            pk.name as package_kind_name,
            p.name,
            p.display_name,
            p.description,
            p.image_id,
            s.app_version,
            r.chart_repository_id as chart_repository_id,
            r.name as chart_repository_name,
            r.display_name as chart_repository_display_name
        from package p
        join package_kind pk using (package_kind_id)
        join chart_repository r using (chart_repository_id)
        join snapshot s using (package_id)
        where websearch_to_tsquery(p_query->>'text') @@ p.tsdoc
        and s.version = p.latest_version
    ), packages_with_all_filters as (
        select * from packages_with_text_filter
        where
            case when cardinality(v_package_kinds) > 0
            then package_kind_id = any(v_package_kinds) else true end
        and
            case when cardinality(v_chart_repositories_ids) > 0
            then chart_repository_id = any(v_chart_repositories_ids) else true end
    )
    select json_build_object(
        'packages', (
            select coalesce(json_agg(json_build_object(
                'package_id', package_id,
                'kind', package_kind_id,
                'name', name,
                'display_name', display_name,
                'description', description,
                'image_id', image_id,
                'app_version', app_version,
                'chart_repository', (
                    select json_build_object(
                        'chart_repository_id', chart_repository_id,
                        'name', chart_repository_name,
                        'display_name', chart_repository_display_name
                    )
                )
            )), '[]')
            from packages_with_all_filters
        ),
        'facets', case when v_facets then (
            select json_build_array(
                (
                    select json_build_object(
                        'title', 'Kind',
                        'filter_key', 'kind',
                        'options', (
                            select coalesce(json_agg(json_build_object(
                                'id', package_kind_id,
                                'name', initcap(package_kind_name),
                                'total', total
                            )), '[]')
                            from (
                                select package_kind_id, package_kind_name, count(*) as total
                                from packages_with_text_filter
                                group by package_kind_id, package_kind_name
                                order by total desc
                            ) as breakdown
                        )
                    )
                ),
                (
                    select json_build_object(
                        'title', 'Repository',
                        'filter_key', 'repo',
                        'options', (
                            select coalesce(json_agg(json_build_object(
                                'id', chart_repository_id,
                                'name', initcap(chart_repository_name),
                                'total', total
                            )), '[]')
                            from (
                                select chart_repository_id, chart_repository_name, count(*) as total
                                from packages_with_text_filter
                                group by chart_repository_id, chart_repository_name
                                order by total desc
                            ) as breakdown
                        )
                    )
                )
            )
        ) else null end
    );
end
$$ language plpgsql;
