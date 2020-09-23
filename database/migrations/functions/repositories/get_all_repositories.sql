-- get_all_repositories returns all available repositories as a json array.
create or replace function get_all_repositories()
returns setof json as $$
    select coalesce(json_agg(rJSON), '[]')
    from (
        select rJSON
        from repository r
        cross join get_repository_by_id(r.repository_id) as rJSON
        order by r.name asc
    ) rs;
$$ language sql;
