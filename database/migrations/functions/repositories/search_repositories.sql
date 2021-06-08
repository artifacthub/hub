-- search_repositories searchs repositories in the database that match the
-- criteria in the query provided.
create or replace function search_repositories(p_input jsonb)
returns table(data json, total_count bigint) as $$
declare
    v_name text := (p_input->>'name');
    v_kinds int[];
    v_users text[];
    v_orgs text[];
    v_include_credentials boolean := (p_input->>'include_credentials')::boolean;
begin
    -- Prepare filters for later use
    select array_agg(e::int) into v_kinds
    from jsonb_array_elements_text(p_input->'kinds') e;
    select array_agg(e::text) into v_users
    from jsonb_array_elements_text(p_input->'users') e;
    select array_agg(e::text) into v_orgs
    from jsonb_array_elements_text(p_input->'orgs') e;

    return query
    with filtered_repositories as (
        select r.repository_id, r.name
        from repository r
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where
            case when v_name is not null then r.name ~* v_name else true end
        and
            case when cardinality(v_kinds) > 0
            then r.repository_kind_id = any(v_kinds) else true end
        and
            case
                when cardinality(v_orgs) > 0 and cardinality(v_users) > 0 then
                    (o.name = any(v_orgs) or u.alias = any(v_users))
                when cardinality(v_orgs) > 0 then
                    o.name = any(v_orgs)
                when cardinality(v_users) > 0 then
                    u.alias = any(v_users)
                else true
            end
    )
    select
        coalesce(json_agg(rJSON), '[]'),
        (select count(*) from filtered_repositories)
    from (
        select rJSON
        from filtered_repositories rmf
        cross join get_repository_by_id(rmf.repository_id, v_include_credentials) as rJSON
        order by rmf.name asc
        limit (p_input->>'limit')::int
        offset (p_input->>'offset')::int
    ) rs;
end
$$ language plpgsql;
