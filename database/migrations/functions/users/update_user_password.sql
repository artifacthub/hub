-- update_user_password updates the password of the user doing the request in
-- the database.
create or replace function update_user_password(p_requesting_user_id uuid, p_old text, p_new text)
returns void as $$
    update "user" set password = p_new
    where user_id = p_requesting_user_id
    and password = p_old;
$$ language sql;
