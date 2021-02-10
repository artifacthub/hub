alter table snapshot add column recommendations jsonb;

---- create above / drop below ----

alter table snapshot drop column recommendations;
