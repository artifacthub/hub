-- enrich_package_data enriches the package's data provided with some extra
-- information.
create or replace function enrich_package_data(p_kind int, p_data jsonb)
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
                            coalesce((
                                select to_jsonb(r.name)
                                from repository r
                                join package p using (repository_id)
                                where r.url = dep->>'repository'
                                and p.name = dep->>'name'
                            ), 'null'),
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
