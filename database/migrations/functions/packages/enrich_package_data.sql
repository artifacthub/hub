-- enrich_package_data enriches the package's data provided with some extra
-- information.
create or replace function enrich_package_data(p_package_id uuid, p_kind int, p_data jsonb)
returns jsonb as $$
declare
    v_data jsonb := p_data;
begin
    case p_kind
        when 0 then -- Helm
            -- Add repository name used in Artifact Hub to each dependency
            if v_data ? 'dependencies' then
                v_data = (select jsonb_set(
                    v_data,
                    '{dependencies}',
                    (
                        select jsonb_agg(jsonb_strip_nulls(jsonb_set(
                            dep,
                            '{artifacthub_repository_name}',
                            coalesce(
                                (
                                    select
                                    case when starts_with(dep->>'repository', 'file://') then (
                                        select to_jsonb(r.name)
                                        from repository r
                                        join package p using (repository_id)
                                        where p.name = dep->>'name'
                                        and r.url = (
                                            select r.url
                                            from repository r
                                            join package p using (repository_id)
                                            where p.package_id = p_package_id
                                        )
                                    ) else (
                                        select to_jsonb(r.name)
                                        from repository r
                                        join package p using (repository_id)
                                        where trim(trailing from r.url, '/') = trim(trailing from dep->>'repository', '/')
                                        and p.name = dep->>'name'
                                    )
                                    end
                                ),
                                'null'
                            ),
                            true
                        )))
                        from (
                            select jsonb_array_elements(v_data->'dependencies') as dep
                        ) as dependencies
                    ),
                    false
                ));
            end if;
        else
    end case;

    return v_data;
end
$$ language plpgsql;
