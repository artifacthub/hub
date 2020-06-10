-- delete_api_key deletes the provided api key from the database.
create or replace function delete_api_key(p_user_id uuid, p_api_key_id uuid)
returns void as $$
    delete from api_key
    where api_key_id = p_api_key_id
    and user_id = p_user_id
$$ language sql;
