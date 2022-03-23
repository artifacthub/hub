-- search_packages searches packages in the database that match the criteria in
-- the query provided.
create or replace function search_packages(p_input jsonb)
returns table(data json, total_count bigint) as $$
declare
    v_repository_kinds int[];
    v_users text[];
    v_orgs text[];
    v_repositories text[];
    v_licenses text[];
    v_capabilities text[];
    v_facets boolean := (p_input->>'facets')::boolean;
    v_tsquery_web tsquery := websearch_to_tsquery(p_input->>'ts_query_web');
    v_tsquery_web_with_prefix_matching tsquery;
    v_tsquery tsquery := to_tsquery(p_input->>'ts_query');
    v_sort text := coalesce(p_input->>'sort', 'relevance');
begin
    -- Prepare filters for later use
    select array_agg(e::int) into v_repository_kinds
    from jsonb_array_elements_text(p_input->'repository_kinds') e;
    select array_agg(e::text) into v_users
    from jsonb_array_elements_text(p_input->'users') e;
    select array_agg(e::text) into v_orgs
    from jsonb_array_elements_text(p_input->'orgs') e;
    select array_agg(e::text) into v_repositories
    from jsonb_array_elements_text(p_input->'repositories') e;
    select array_agg(e::text) into v_licenses
    from jsonb_array_elements_text(p_input->'licenses') e;
    select array_agg(e::text) into v_capabilities
    from jsonb_array_elements_text(p_input->'capabilities') e;

    -- Prepare v_tsquery_web_with_prefix_matching
    if v_tsquery_web is not null then
        select ts_rewrite(
            v_tsquery_web,
            format('
                select
                    to_tsquery(lexeme),
                    to_tsquery(lexeme || '':*'')
                from unnest(tsvector_to_array(to_tsvector(%L))) as lexeme
                ', p_input->>'ts_query_web'
            )
        ) into v_tsquery_web_with_prefix_matching;
    end if;

    return query
    with filtered_packages_excluding_facets_filters as (
        select
            p.package_id,
            p.name,
            p.normalized_name,
            p.stars,
            p.tsdoc,
            p.official as package_official,
            s.display_name,
            s.description,
            s.logo_image_id,
            s.version,
            s.app_version,
            s.license,
            s.capabilities,
            s.deprecated,
            s.signed,
            s.signatures,
            s.security_report_summary,
            s.containers_images,
            s.ts,
            r.repository_id,
            r.repository_kind_id,
            rk.name as repository_kind_name,
            r.name as repository_name,
            r.url as repository_url,
            r.display_name as repository_display_name,
            r.verified_publisher,
            r.official as repository_official,
            r.scanner_disabled as repository_scanner_disabled,
            u.alias as user_alias,
            o.name as organization_name,
            o.display_name as organization_display_name
        from package p
        join snapshot s using (package_id)
        join repository r using (repository_id)
        join repository_kind rk using (repository_kind_id)
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where s.version = p.latest_version
        and
            case when v_tsquery_web is not null then
                v_tsquery_web_with_prefix_matching @@ p.tsdoc
            else true end
        and
            case when v_tsquery is not null then
                v_tsquery @@ p.tsdoc
            else true end
        and
            case when p_input ? 'verified_publisher' and (p_input->>'verified_publisher')::boolean = true then
                r.verified_publisher = true
            else
                true
            end
        and
            case when p_input ? 'official' and (p_input->>'official')::boolean = true then
                (r.official = true or p.official = true)
            else
                true
            end
        and
            case when p_input ? 'operators' and (p_input->>'operators')::boolean = true then
                p.is_operator = true
            else
                true
            end
        and
            case when p_input ? 'deprecated' and (p_input->>'deprecated')::boolean = true then
                true
            else
                (s.deprecated is null or s.deprecated = false)
            end
    ), filtered_packages as (
        select * from filtered_packages_excluding_facets_filters
        where
            case when cardinality(v_repository_kinds) > 0
            then repository_kind_id = any(v_repository_kinds) else true end
        and
            case
                when cardinality(v_orgs) > 0 and cardinality(v_users) > 0 then
                    (organization_name = any(v_orgs) or user_alias = any(v_users))
                when cardinality(v_orgs) > 0 then
                    organization_name = any(v_orgs)
                when cardinality(v_users) > 0 then
                    user_alias = any(v_users)
                else true
            end
        and
            case when cardinality(v_repositories) > 0
            then repository_name = any(v_repositories) else true end
        and
            case when cardinality(v_licenses) > 0
            then license = any(v_licenses) else true end
        and
            case when cardinality(v_capabilities) > 0
            then capabilities = any(v_capabilities) else true end
    )
    select
        json_strip_nulls(json_build_object(
            'packages', (
                select coalesce(json_agg(json_build_object(
                    'package_id', package_id,
                    'name', name,
                    'normalized_name', normalized_name,
                    'logo_image_id', logo_image_id,
                    'stars', stars,
                    'official', package_official,
                    'display_name', display_name,
                    'description', description,
                    'version', version,
                    'app_version', app_version,
                    'license', license,
                    'deprecated', deprecated,
                    'signed', signed,
                    'signatures', signatures,
                    'security_report_summary', security_report_summary,
                    'all_containers_images_whitelisted', are_all_containers_images_whitelisted(containers_images),
                    'production_organizations_count', (
                        select count(*) from production_usage
                        where package_id = filtered_packages_paginated.package_id
                    ),
                    'ts', floor(extract(epoch from ts)),
                    'repository', jsonb_build_object(
                        'repository_id', repository_id,
                        'kind', repository_kind_id,
                        'name', repository_name,
                        'display_name', repository_display_name,
                        'url', repository_url,
                        'verified_publisher', verified_publisher,
                        'official', repository_official,
                        'scanner_disabled', repository_scanner_disabled,
                        'user_alias', user_alias,
                        'organization_name', organization_name,
                        'organization_display_name', organization_display_name
                    )
                )), '[]')
                from (
                    select * from (
                        select
                            fp.*,
                            (case when v_tsquery_web is not null then
                                trunc(ts_rank(ts_filter(tsdoc, '{a}'), v_tsquery_web, 1)::numeric, 2) +
                                trunc(ts_rank('{0.1, 0.2, 0.2, 1.0}', ts_filter(tsdoc, '{b,c}'), v_tsquery_web)::numeric, 2)
                            else 1 end) as relevance,
                            (case
                                when repository_official = true or package_official = true
                                then true else false
                            end) as official
                        from filtered_packages fp
                    ) as fpe
                    order by
                        case when v_sort = 'relevance' then (relevance, stars) end desc,
                        case when v_sort = 'stars' then (stars, relevance) end desc,
                        official desc,
                        verified_publisher desc,
                        name asc
                    limit (p_input->>'limit')::int
                    offset (p_input->>'offset')::int
                ) filtered_packages_paginated
            ),
            'facets', case when v_facets then (
                select json_build_array(
                    (
                        select json_build_object(
                            'title', 'Kind',
                            'filter_key', 'kind',
                            'options', (
                                select coalesce(json_agg(json_build_object(
                                    'id', repository_kind_id,
                                    'name', repository_kind_name,
                                    'total', total
                                )), '[]')
                                from (
                                    select
                                        repository_kind_id,
                                        repository_kind_name,
                                        count(*) as total
                                    from filtered_packages_excluding_facets_filters
                                    group by repository_kind_id, repository_kind_name
                                    order by total desc, repository_kind_name asc
                                ) as kinds_breakdown
                            )
                        )
                    ),
                    (
                        select json_build_object(
                            'title', 'Publisher',
                            'filter_key', 'publisher',
                            'options', (
                                select coalesce(json_agg(json_build_object(
                                    'filter_key', filter_key,
                                    'id', id,
                                    'name', name,
                                    'total', total
                                )), '[]')
                                from (
                                    select filter_key, id, name, total
                                    from (
                                        -- Organizations
                                        select
                                            1 as pri,
                                            'org' as filter_key,
                                            organization_name as id,
                                            coalesce(organization_display_name, organization_name) as name,
                                            count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where organization_name = any(v_orgs)
                                        group by organization_name, organization_display_name
                                        union
                                        select
                                            2 as pri,
                                            'org' as filter_key,
                                            organization_name as id,
                                            coalesce(organization_display_name, organization_name) as name,
                                            count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where organization_name is not null
                                        and
                                            case when cardinality(v_orgs) > 0
                                            then organization_name <> all(v_orgs) else true end
                                        group by organization_name, organization_display_name
                                        union
                                        -- Users
                                        select
                                            1 as pri,
                                            'user' as filter_key,
                                            user_alias as id,
                                            user_alias as name,
                                            count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where user_alias = any(v_users)
                                        group by user_alias
                                        union
                                        select
                                            2 as pri,
                                            'user' as filter_key,
                                            user_alias as id,
                                            user_alias as name,
                                            count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where user_alias is not null
                                        and
                                            case when cardinality(v_users) > 0
                                            then user_alias <> all(v_users) else true end
                                        group by user_alias
                                    ) as publishers
                                    order by pri asc, total desc, id asc
                                    limit 10
                                ) as publishers_breakdown
                            )
                        )
                    ),
                    (
                        select json_build_object(
                            'title', 'Repository',
                            'filter_key', 'repo',
                            'options', (
                                select coalesce(json_agg(json_build_object(
                                    'id', repository_name,
                                    'name', coalesce(repository_display_name, initcap(repository_name)),
                                    'total', total
                                )), '[]')
                                from (
                                    select repository_name, repository_display_name, total
                                    from (
                                        select 1 as pri, repository_name, repository_display_name, count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where repository_name = any(v_repositories)
                                        group by repository_name, repository_display_name
                                        union
                                        select 2 as pri, repository_name, repository_display_name, count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where repository_name is not null
                                        and
                                            case when cardinality(v_repositories) > 0
                                            then repository_name <> all(v_repositories) else true end
                                        group by repository_name, repository_display_name
                                    ) as repos
                                    order by pri asc, total desc, repository_name asc
                                    limit 10
                                ) as repositories_breakdown
                            )
                        )
                    ),
                    (
                        select json_build_object(
                            'title', 'License',
                            'filter_key', 'license',
                            'options', (
                                select coalesce(json_agg(json_build_object(
                                    'id', license,
                                    'name', license,
                                    'total', total
                                )), '[]')
                                from (
                                    select license, total
                                    from (
                                        select 1 as pri, license, count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where license = any(v_licenses)
                                        group by license
                                        union
                                        select 2 as pri, license, count(*) as total
                                        from filtered_packages_excluding_facets_filters
                                        where license is not null
                                        and
                                            case when cardinality(v_licenses) > 0
                                            then license <> all(v_licenses) else true end
                                        group by license
                                    ) as orgs
                                    order by pri asc, total desc, license asc
                                    limit 10
                                ) as licenses_breakdown
                            )
                        )
                    ),
                    (
                        select json_build_object(
                            'title', 'Operator capabilities',
                            'filter_key', 'capabilities',
                            'options', (
                                select coalesce(json_agg(json_build_object(
                                    'id', capabilities,
                                    'name', capabilities,
                                    'total', total
                                )), '[]')
                                from (
                                    select capabilities, count(*) as total
                                    from filtered_packages_excluding_facets_filters
                                    where capabilities is not null
                                    group by capabilities
                                    order by total desc, capabilities asc
                                ) as capabilities_breakdown
                            )
                        )
                    )
                )
            ) else null end
        )),
        (select count(*) from filtered_packages);
end
$$ language plpgsql;
