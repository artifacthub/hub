alter table snapshot add column screenshots jsonb;

---- create above / drop below ----

alter table snapshot drop column screenshots;
