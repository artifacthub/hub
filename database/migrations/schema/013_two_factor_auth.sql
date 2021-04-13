alter table "user" add column tfa_enabled boolean;
alter table "user" add column tfa_recovery_codes text[];
alter table "user" add column tfa_url text;
alter table session add column approved boolean;
drop function if exists register_session(p_session jsonb);

---- create above / drop below ----

alter table "user" drop column tfa_enabled;
alter table "user" drop column tfa_recovery_codes;
alter table "user" drop column tfa_url;
alter table session drop column approved;
