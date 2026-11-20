-- register_session_with_password registers the provided session, provided the
-- password hash the caller checked (login) or has just set (password reset) is
-- still the user's current one. It waits for any in-flight password change, so
-- a session can never outlive the reset or update that replaced the password.
create or replace function register_session_with_password(p_session jsonb, p_password text)
returns boolean as $$
begin
    perform from "user"
    where user_id = (p_session->>'user_id')::uuid
    and password = p_password
    for share;
    if not found then
        raise 'password changed';
    end if;

    return register_session(p_session);
end
$$ language plpgsql;
