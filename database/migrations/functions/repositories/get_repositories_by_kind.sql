-- get_repositories_by_kind returns all available repositories of a given kind
-- as a json array.
create or replace function get_repositories_by_kind(p_kind int, p_include_credentials boolean)
returns setof json as $$
    select coalesce(json_agg(rJSON), '[]')
    from (
        select rJSON
        from repository r
        cross join get_repository_by_id(r.repository_id, p_include_credentials) as rJSON
        where r.repository_kind_id = p_kind
        order by r.name asc
    ) rs;
$$ language sql;
