-- approve_session approves the provided session in the database, which must
-- be pending approval. When a recovery code is provided, it is removed from
-- the session owner's codes so that it can't be used again. The code must
-- still be one of the owner's codes, so concurrent approvals cannot use the
-- same code twice.
create or replace function approve_session(p_session_id text, p_recovery_code text)
returns void as $$
begin
    -- If a recovery code was used, remove it from the session owner's codes
    -- (the user row is locked before the session row, as in reset_user_password).
    -- A concurrent approval using the same code waits for the user row and
    -- then finds the code gone
    if p_recovery_code <> '' then
        update "user" set tfa_recovery_codes = array_remove(tfa_recovery_codes, p_recovery_code)
        where user_id = (
            select user_id from session where session_id = p_session_id and approved = false
        )
        and p_recovery_code = any(tfa_recovery_codes);
        if not found then
            perform from session where session_id = p_session_id and approved = false;
            if not found then
                raise 'session not pending';
            end if;
            raise 'invalid recovery code';
        end if;
    end if;

    -- Mark session as approved. The session may have been approved or deleted
    -- (password reset or update) since the caller looked it up; raising undoes
    -- the removal of the recovery code
    update session set approved = true where session_id = p_session_id and approved = false;
    if not found then
        raise 'session not pending';
    end if;
end
$$ language plpgsql;
