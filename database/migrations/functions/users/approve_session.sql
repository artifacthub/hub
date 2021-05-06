-- approvee_session approves the provided session in the database.
create or replace function approve_session(p_session_id text, p_recovery_code text)
returns void as $$
begin
    -- Mark session as approved
    update session set approved = true where session_id = p_session_id;

    -- If a recovery code was used, remove it so that it can't be used again
    if p_recovery_code <> '' then
        update "user" set tfa_recovery_codes = array_remove(tfa_recovery_codes, p_recovery_code);
    end if;
end
$$ language plpgsql;
