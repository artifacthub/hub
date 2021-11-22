alter table snapshot add column signatures text[];
update snapshot set signatures = '{"prov"}' where signed = true;

---- create above / drop below ----

alter table snapshot drop column signatures;
