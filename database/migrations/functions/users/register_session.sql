-- register_session registers the provided session in the database.
create or replace function register_session(p_session jsonb)
returns bytea as $$
declare
    v_session_id bytea := gen_random_bytes(32);
begin
    insert into session (
        session_id,
        user_id,
        ip,
        user_agent
    ) values (
        sha512(v_session_id),
        (p_session->>'user_id')::uuid,
        nullif(p_session->>'ip', '')::inet,
        nullif(p_session->>'user_agent', '')
    );
    return v_session_id;
end
$$ language plpgsql;
