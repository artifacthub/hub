-- reset_user_password resets the password of the user associated to the code
-- provided if it is still valid, returning the email of the user.
create or replace function reset_user_password(p_code bytea, p_new_password text)
returns text as $$
declare
    v_user_id uuid;
    v_email text;
begin
    -- Verify password reset code
    perform verify_password_reset_code(p_code);

    -- Get id and email of the user associated with the code
    select u.user_id, u.email into v_user_id, v_email
    from "user" u
    join password_reset_code prc using (user_id)
    where password_reset_code_id = sha512(p_code);

    -- Update user password
    update "user" set password = p_new_password where user_id = v_user_id;

    -- Delete password reset code
    delete from password_reset_code where user_id = v_user_id;

    -- Invalidate current user sessions
    delete from session where user_id = v_user_id;

    return v_email;
end
$$ language plpgsql;
