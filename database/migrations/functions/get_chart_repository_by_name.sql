create or replace function get_chart_repository_by_name(p_name text)
returns setof json as $$
    select row_to_json(chart_repository)
    from chart_repository
    where name = p_name;
$$ language sql;
