-- register_password_reset_code registers a password reset code for the user
-- identified by the email provided.
create or replace function register_password_reset_code(p_email text)
returns bytea as $$
declare
    v_code bytea := gen_random_bytes(32);
begin
    insert into password_reset_code (password_reset_code_id, user_id)
    select sha512(v_code), user_id from "user" where email = p_email and email_verified = true
    on conflict (user_id) do update set
        password_reset_code_id = sha512(v_code),
        created_at = current_timestamp;
    if not found then
        raise 'invalid email';
    end if;
    return v_code;
end
$$ language plpgsql;
