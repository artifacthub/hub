delete from password_reset_code;
alter table password_reset_code alter column password_reset_code_id drop default;
alter table password_reset_code alter column password_reset_code_id type bytea using password_reset_code_id::text::bytea;
drop function if exists register_password_reset_code(text);

---- create above / drop below ----

delete from password_reset_code;
alter table password_reset_code alter column password_reset_code_id type uuid;
alter table password_reset_code alter column password_reset_code_id set default gen_random_uuid();
