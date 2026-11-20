-- register_password_reset_code registers a password reset code for the user
-- identified by the email provided. A user has at most one code, and it is only
-- replaced when it is older than 3 hours; until then the request is refused,
-- so the link already sent keeps working. The 3 hours must stay at least 1 hour
-- below the 4 hours lifetime in verify_password_reset_code, so that a refused
-- request always leaves a link with at least 1 hour left.
create or replace function register_password_reset_code(p_email text, p_code text)
returns void as $$
declare
    v_user_id uuid;
begin
    -- Get the user the email belongs to
    select user_id into v_user_id from "user" where email = p_email;
    if not found then
        raise 'invalid email';
    end if;

    -- Register the code, unless the user has one that is 3 hours old or less.
    -- Concurrent requests queue on the existing row (or on the unique index)
    -- and re-check the condition against the latest committed code
    insert into password_reset_code as prc (password_reset_code_id, user_id)
    values (p_code, v_user_id)
    on conflict (user_id) do update set
        password_reset_code_id = excluded.password_reset_code_id,
        created_at = current_timestamp
    where prc.created_at < current_timestamp - '3 hours'::interval;
    if not found then
        raise 'password reset code already registered';
    end if;
end
$$ language plpgsql;
