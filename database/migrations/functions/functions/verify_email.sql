-- verify_email verifies an email using the provided email verification code,
-- returning true if the email was verified successfully or false otherwise.
create or replace function verify_email(p_code uuid)
returns boolean as $$
begin
    -- Check if email verification code exists and is not expired
    perform from email_verification_code
    where email_verification_code_id = p_code
    and created_at + '1 day'::interval > current_timestamp;
    if not found then
        return false;
    end if;

    -- Mark email as verified in user record
    update "user"
    set email_verified = true
    where user_id = (
        select user_id from email_verification_code
        where email_verification_code_id = p_code
    );

    -- Delete email verification code
    delete from email_verification_code
    where email_verification_code_id = p_code;

    return true;
end
$$ language plpgsql;
