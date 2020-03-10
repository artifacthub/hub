-- updates_chart_repository updates the provided chart repository in the
-- database.
create or replace function update_chart_repository(p_chart_repository jsonb)
returns void as $$
    update chart_repository set
        display_name = nullif(p_chart_repository->>'display_name', ''),
        url = p_chart_repository->>'url'
    where name = p_chart_repository->>'name'
    and user_id = (p_chart_repository->>'user_id')::uuid;
$$ language sql;
