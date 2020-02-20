-- get_chart_repositories returns all available chart repositories as a json
-- array.
create or replace function get_chart_repositories()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'chart_repository_id', chart_repository_id,
        'name', name,
        'display_name', display_name,
        'url', url
    )), '[]')
    from chart_repository;
$$ language sql;
