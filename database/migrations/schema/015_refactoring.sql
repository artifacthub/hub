delete from password_reset_code;
alter table password_reset_code alter column password_reset_code_id type text;
alter table session alter column session_id type text using substring(session_id::bytea::text from 3);
drop function if exists add_api_key(jsonb);
drop function if exists approve_session(bytea, text);
drop function if exists register_password_reset_code(text);
drop function if exists register_session(jsonb);
drop function if exists reset_user_password(bytea, text);
drop function if exists verify_password_reset_code(bytea);

---- create above / drop below ----

delete from password_reset_code;
alter table password_reset_code alter column password_reset_code_id type bytea;
alter table session alter column session_id type bytea using session_id::text::bytea;
