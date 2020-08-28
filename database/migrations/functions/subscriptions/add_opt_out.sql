-- add_opt_out adds the provided opt-out entry to the database.
create or replace function add_opt_out(p_opt_out jsonb)
returns void as $$
    insert into opt_out (
        user_id,
        repository_id,
        event_kind_id
    ) values (
        (p_opt_out->>'user_id')::uuid,
        (p_opt_out->>'repository_id')::uuid,
        (p_opt_out->>'event_kind')::int
    );
$$ language sql;
