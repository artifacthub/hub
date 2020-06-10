-- add_api_key adds the provided api key to the database.
create or replace function add_api_key(p_api_key jsonb)
returns bytea as $$
    insert into api_key (
        name,
        user_id
    ) values (
        p_api_key->>'name',
        (p_api_key->>'user_id')::uuid
    )
    returning key;
$$ language sql;
