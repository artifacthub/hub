-- get_repositories returns all available repositories that belong to the
-- provided user as a json array.
create or replace function get_user_repositories(p_user_id uuid, p_include_credentials boolean)
returns setof json as $$
    select coalesce(json_agg(rJSON), '[]')
    from (
        select rJSON
        from repository r
        cross join get_repository_by_id(r.repository_id, p_include_credentials) as rJSON
        where user_id is not null
        and user_id = p_user_id
        order by r.name asc
    ) rs;
$$ language sql;
