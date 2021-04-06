-- add_api_key adds the provided api key to the database.
create or replace function add_api_key(p_api_key jsonb)
returns setof json as $$
declare
    v_api_key_id uuid;
    v_api_key_secret text := encode(gen_random_bytes(32), 'base64');
begin
    insert into api_key (
        name,
        secret,
        user_id
    ) values (
        p_api_key->>'name',
        encode(sha512(v_api_key_secret::bytea), 'hex'),
        (p_api_key->>'user_id')::uuid
    ) returning api_key_id into v_api_key_id;

    return query select json_build_object(
        'api_key_id', v_api_key_id,
        'secret', v_api_key_secret
    );
end
$$ language plpgsql;
