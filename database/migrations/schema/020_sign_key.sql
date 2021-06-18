alter table snapshot add column sign_key jsonb;

---- create above / drop below ----

alter table snapshot drop column sign_key;
