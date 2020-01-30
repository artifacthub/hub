-- search_packages searchs packages in the database that match the criteria in
-- the query provided.
create or replace function search_packages(p_query jsonb)
returns setof json as $$
begin
    if not p_query ? 'text' or p_query->>'text' = '' then
        raise 'invalid query text';
    end if;

    return query
    select json_build_object(
        'packages', (
            select coalesce(json_agg(json_build_object(
                'package_id', p.package_id,
                'kind', p.package_kind_id,
                'name', p.name,
                'display_name', p.display_name,
                'description', p.description,
                'logo_url', p.logo_url,
                'app_version', s.app_version,
                'chart_repository', (
                    select json_build_object(
                        'name', r.name,
                        'display_name', r.display_name
                    )
                )
            )), '[]')
            from package p
            join chart_repository r using (chart_repository_id)
            join snapshot s using (package_id)
            where to_tsquery(p_query->>'text') @@ p.tsdoc
            and p.latest_version = s.version
        )
    );
end
$$ language plpgsql;
