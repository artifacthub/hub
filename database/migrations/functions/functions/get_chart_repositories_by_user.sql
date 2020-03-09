-- get_chart_repositories_by_user returns all available chart repositories that
-- belong to the provided user as a json array.
create or replace function get_chart_repositories_by_user(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'chart_repository_id', chart_repository_id,
        'name', name,
        'display_name', display_name,
        'url', url
    )), '[]')
    from chart_repository
    where user_id is not null
    and user_id = p_user_id;
$$ language sql;
