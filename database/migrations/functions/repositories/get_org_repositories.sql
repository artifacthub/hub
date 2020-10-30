-- get_org_repositories returns all available repositories that belong to the
-- provided organization as a json array. The user provided must belong to the
-- organization used.
create or replace function get_org_repositories(p_user_id uuid, p_org_name text, p_include_credentials boolean)
returns setof json as $$
    select coalesce(json_agg(rJSON), '[]')
    from (
        select rJSON
        from repository r
        join organization o using (organization_id)
        join user__organization uo using (organization_id)
        cross join get_repository_by_id(r.repository_id, p_include_credentials) as rJSON
        where o.name = p_org_name
        and uo.user_id = p_user_id
        and uo.confirmed = true
        order by r.name asc
    ) rs;
$$ language sql;
