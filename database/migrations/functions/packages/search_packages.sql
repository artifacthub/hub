-- search_packages searchs packages in the database that match the criteria in
-- the query provided.
create or replace function search_packages(p_input jsonb)
returns setof json as $$
declare
    v_package_kinds int[];
    v_chart_repositories text[];
    v_facets boolean := (p_input->>'facets')::boolean;
begin
    -- Prepare filters for later use
    select array_agg(e::int) into v_package_kinds
    from jsonb_array_elements_text(p_input->'package_kinds') e;
    select array_agg(e::text) into v_chart_repositories
    from jsonb_array_elements_text(p_input->'chart_repositories') e;

    return query
    with packages_applying_text_and_deprecated_filters as (
        select
            p.package_id,
            p.package_kind_id,
            pk.name as package_kind_name,
            p.name,
            p.normalized_name,
            p.display_name,
            p.description,
            p.logo_image_id,
            p.deprecated,
            p.stars,
            s.version,
            s.app_version,
            u.alias as user_alias,
            o.name as organization_name,
            o.display_name as organization_display_name,
            r.name as chart_repository_name,
            r.display_name as chart_repository_display_name
        from package p
        join package_kind pk using (package_kind_id)
        join snapshot s using (package_id)
        left join chart_repository r using (chart_repository_id)
        left join "user" u on p.user_id = u.user_id or r.user_id = u.user_id
        left join organization o
            on p.organization_id = o.organization_id or r.organization_id = o.organization_id
        where s.version = p.latest_version
        and
            case when p_input ? 'text' and p_input->>'text' <> '' then
                websearch_to_tsquery(p_input->>'text') @@ p.tsdoc
            else true end
        and
            case when p_input ? 'deprecated' and (p_input->>'deprecated')::boolean = true then
                true
            else
                (deprecated is null or deprecated = false)
            end
    ), packages_applying_all_filters as (
        select * from packages_applying_text_and_deprecated_filters
        where
            case when cardinality(v_package_kinds) > 0
            then package_kind_id = any(v_package_kinds) else true end
        and
            case when cardinality(v_chart_repositories) > 0
            then chart_repository_name = any(v_chart_repositories) else true end
        and
            case when p_input ? 'deprecated' and (p_input->>'deprecated')::boolean = true then
                true
            else
                (deprecated is null or deprecated = false)
            end
    )
    select json_build_object(
        'data', (
            select json_build_object(
                'packages', (
                    select coalesce(json_agg(json_build_object(
                        'package_id', package_id,
                        'kind', package_kind_id,
                        'name', name,
                        'normalized_name', normalized_name,
                        'display_name', display_name,
                        'description', description,
                        'logo_image_id', logo_image_id,
                        'deprecated', deprecated,
                        'stars', stars,
                        'version', version,
                        'app_version', app_version,
                        'user_alias', user_alias,
                        'organization_name', organization_name,
                        'organization_display_name', organization_display_name,
                        'chart_repository', (select nullif(
                            jsonb_build_object(
                                'name', chart_repository_name,
                                'display_name', chart_repository_display_name
                            ),
                            '{"name": null, "display_name": null}'::jsonb
                        ))
                    )), '[]')
                    from (
                        select * from packages_applying_all_filters
                        order by stars desc, name asc
                        limit (p_input->>'limit')::int
                        offset (p_input->>'offset')::int
                    ) packages_applying_all_filters_paginated
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
                                        'name', package_kind_name,
                                        'total', total
                                    )), '[]')
                                    from (
                                        select
                                            package_kind_id,
                                            package_kind_name,
                                            count(*) as total
                                        from packages_applying_text_and_deprecated_filters
                                        group by package_kind_id, package_kind_name
                                        order by total desc
                                    ) as breakdown
                                )
                            )
                        ),
                        (
                            select json_build_object(
                                'title', 'Chart Repository',
                                'filter_key', 'repo',
                                'options', (
                                    select coalesce(json_agg(json_build_object(
                                        'id', chart_repository_name,
                                        'name', initcap(chart_repository_name),
                                        'total', total
                                    )), '[]')
                                    from (
                                        select
                                            chart_repository_name,
                                            count(*) as total
                                        from packages_applying_text_and_deprecated_filters
                                        where chart_repository_name is not null
                                        group by chart_repository_name
                                        order by total desc
                                    ) as breakdown
                                )
                            )
                        )
                    )
                ) else null end
            )
        ),
        'metadata', (
            select json_build_object(
                'limit', (p_input->>'limit')::int,
                'offset', (p_input->>'offset')::int,
                'total', (select count(*) from packages_applying_all_filters)
            )
        )
    );
end
$$ language plpgsql;
