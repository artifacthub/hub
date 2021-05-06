-- register_session registers the provided session in the database.
create or replace function register_session(p_session jsonb)
returns boolean as $$
declare
    v_approved boolean;
begin
    -- Check if the session requires approval or not. When the user has enabled
    -- TFA, the session will be created as non-approved as it requires user's
    -- approval by providing a TFA passcode.
    select
        case when (tfa_enabled is null or tfa_enabled = false) then true else false end
        into v_approved
    from "user"
    where user_id = (p_session->>'user_id')::uuid;

    -- Register session
    insert into session (
        session_id,
        user_id,
        ip,
        user_agent,
        approved
    ) values (
        p_session->>'session_id',
        (p_session->>'user_id')::uuid,
        nullif(p_session->>'ip', '')::inet,
        nullif(p_session->>'user_agent', ''),
        v_approved
    );

    return v_approved;
end
$$ language plpgsql;
