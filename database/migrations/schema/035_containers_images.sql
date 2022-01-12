insert into repository_kind values (12, 'Containers images');
alter table snapshot drop constraint snapshot_package_id_digest_key;
alter table repository add column data jsonb;

---- create above / drop below ----

delete from repository_kind where repository_kind_id = 12;
alter table snapshot add constraint snapshot_package_id_digest_key unique (package_id, digest);
alter table repository drop column data;
