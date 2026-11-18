-- reset_user_password resets the password of the user associated to the code
-- provided if it is still valid, returning the email of the user. The code is
-- consumed, so it can be used only once, even by concurrent requests.
create or replace function reset_user_password(p_code text, p_new_password text)
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
    where password_reset_code_id = p_code;

    -- Update user password and mark email as verified
    update "user" set
        password = p_new_password,
        email_verified = true
    where user_id = v_user_id;

    -- Consume the password reset code. The user row is locked above, so a
    -- concurrent reset with the same code, or one whose code has just been
    -- replaced, finds no code here and fails, undoing its password update
    delete from password_reset_code where password_reset_code_id = p_code;
    if not found then
        raise 'invalid password reset code';
    end if;

    -- Invalidate current user sessions
    delete from session where user_id = v_user_id;

    return v_email;
end
$$ language plpgsql;
