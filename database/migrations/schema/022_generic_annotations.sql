alter table snapshot add column annotations jsonb;

---- create above / drop below ----

alter table snapshot drop column annotations;
