-- update_api_key updates the provided api key in the database.
create or replace function update_api_key(p_api_key jsonb)
returns void as $$
    update api_key
    set name = p_api_key->>'name'
    where api_key_id = (p_api_key->>'api_key_id')::uuid
    and user_id = (p_api_key->>'user_id')::uuid;
$$ language sql;
