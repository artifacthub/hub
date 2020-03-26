-- register_session registers the provided session in the database.
create or replace function register_session(p_session jsonb)
returns bytea as $$
    insert into session (
        user_id,
        ip,
        user_agent
    ) values (
        (p_session->>'user_id')::uuid,
        nullif(p_session->>'ip', '')::inet,
        nullif(p_session->>'user_agent', '')
    ) returning session_id;
$$ language sql;
