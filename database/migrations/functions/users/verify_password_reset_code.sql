-- verify_password_reset_code verifies is the password reset code provided is
-- valid. The code must exist and not have expired.
create or replace function verify_password_reset_code(p_code text)
returns void as $$
begin
    perform from password_reset_code
    where password_reset_code_id = p_code
    and created_at + '15 minute'::interval > current_timestamp;
    if not found then
        raise 'invalid password reset code';
    end if;
end
$$ language plpgsql;
