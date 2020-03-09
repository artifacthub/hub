-- add_chart_repository adds the provided chart repository to the database.
create or replace function add_chart_repository(p_chart_repository jsonb)
returns void as $$
begin
    if (p_chart_repository->>'user_id')::uuid is null then
        raise 'a valid user_id must be provided';
    end if;

    insert into chart_repository (
        name,
        display_name,
        url,
        user_id
    ) values (
        p_chart_repository->>'name',
        nullif(p_chart_repository->>'display_name', ''),
        p_chart_repository->>'url',
        (p_chart_repository->>'user_id')::uuid
    );
end
$$ language plpgsql;
