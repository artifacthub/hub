-- register_password_reset_code registers a password reset code for the user
-- identified by the email provided.
create or replace function register_password_reset_code(p_email text)
returns uuid as $$
    insert into password_reset_code (user_id)
    select user_id from "user" where email = p_email and email_verified = true
    on conflict (user_id) do update set
        password_reset_code_id = gen_random_uuid(),
        created_at = current_timestamp
    returning password_reset_code_id;
$$ language sql;
