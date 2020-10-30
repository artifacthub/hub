-- get_repository_by_name returns the repository identified by the name
-- provided as a json object.
create or replace function get_repository_by_name(p_name text, p_include_credentials boolean)
returns setof json as $$
    select get_repository_by_id(r.repository_id, p_include_credentials)
    from repository r
    where r.name = p_name;
$$ language sql;
