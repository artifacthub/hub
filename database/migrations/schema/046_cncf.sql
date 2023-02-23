alter table repository add column cncf boolean;
alter table package add column cncf boolean;

 ---- create above / drop below ----

alter table repository drop column cncf;
alter table package drop column cncf;
