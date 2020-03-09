-- delete_chart_repository deletes the provided chart repository from the
-- database.
create or replace function delete_chart_repository(p_chart_repository jsonb)
returns void as $$
    delete from chart_repository
    where name = p_chart_repository->>'name'
    and user_id = (p_chart_repository->>'user_id')::uuid;
$$ language sql;
