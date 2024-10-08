-- update_user_password updates the password of the user doing the request in
-- the database.
create or replace function update_user_password(p_requesting_user_id uuid, p_old text, p_new text)
returns void as $$
begin
    -- Update user password
    update "user" set password = p_new
    where user_id = p_requesting_user_id
    and password = p_old;

    -- Invalidate current user sessions
    if found then
        delete from session where user_id = p_requesting_user_id;
    end if;
end
$$ language plpgsql;
