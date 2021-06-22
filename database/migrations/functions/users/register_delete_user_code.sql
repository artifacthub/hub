-- register_delete_user_code registers a user delete code for the user provided.
create or replace function register_delete_user_code(p_user_id uuid, p_code text)
returns void as $$
    insert into delete_user_code (delete_user_code_id, user_id)
    values (p_code, p_user_id)
    on conflict (user_id) do update set
        delete_user_code_id = p_code,
        created_at = current_timestamp;
$$ language sql;
