-- register_password_reset_code registers a password reset code for the user
-- identified by the email provided.
create or replace function register_password_reset_code(p_email text, p_code text)
returns void as $$
begin
    insert into password_reset_code (password_reset_code_id, user_id)
    select p_code, user_id from "user" where email = p_email
    on conflict (user_id) do update set
        password_reset_code_id = p_code,
        created_at = current_timestamp;
    if not found then
        raise 'invalid email';
    end if;
end
$$ language plpgsql;
