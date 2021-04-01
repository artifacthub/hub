alter table api_key add column secret text;
update api_key set secret = crypt(encode(key, 'base64'), gen_salt('bf'));
alter table api_key alter column secret set not null;
alter table api_key drop column key;
drop function if exists add_api_key(jsonb);
drop index api_key_user_id_idx;

---- create above / drop below ----

-- This migration cannot be fully reverted. Doing it will result in deleting all existing api keys.

delete from api_key;
alter table api_key drop column secret;
alter table api_key add column key bytea not null default gen_random_bytes(32);
