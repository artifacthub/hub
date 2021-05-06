-- add_api_key adds the provided api key to the database.
create or replace function add_api_key(p_api_key jsonb)
returns uuid as $$
declare
    v_api_key_id uuid;
begin
    insert into api_key (
        name,
        secret,
        user_id
    ) values (
        p_api_key->>'name',
        p_api_key->>'secret',
        (p_api_key->>'user_id')::uuid
    ) returning api_key_id into v_api_key_id;

    return v_api_key_id;
end
$$ language plpgsql;
