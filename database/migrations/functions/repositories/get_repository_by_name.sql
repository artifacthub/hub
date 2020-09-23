-- get_repository_by_name returns the repository identified by the name
-- provided as a json object.
create or replace function get_repository_by_name(p_name text)
returns setof json as $$
    select get_repository_by_id(r.repository_id)
    from repository r
    where r.name = p_name;
$$ language sql;
