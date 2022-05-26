-- register_user registers the provided user in the database, creating an email
-- verification code that should be used to confirm email ownership.
create or replace function register_user(p_user jsonb)
returns uuid as $$
declare
    v_user_id uuid;
    v_email_verification_code uuid;
begin
    -- Register user
    insert into "user" (
        alias,
        first_name,
        last_name,
        email,
        email_verified,
        password,
        profile_image_id
    ) values (
        p_user->>'alias',
        nullif(p_user->>'first_name', ''),
        nullif(p_user->>'last_name', ''),
        p_user->>'email',
        (p_user->>'email_verified')::boolean,
        nullif(p_user->>'password', ''),
        nullif(p_user->>'profile_image_id', '')::uuid
    ) returning user_id into v_user_id;

    -- Register email verification code if email isn't already verified
    if (p_user->>'email_verified')::boolean = false then
        insert into email_verification_code (user_id)
        values (v_user_id)
        returning email_verification_code_id into v_email_verification_code;
    end if;

    return v_email_verification_code;
end
$$ language plpgsql;
