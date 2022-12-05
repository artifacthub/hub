alter table package_views alter column package_id drop not null;
alter table package_views alter column version drop not null;
alter table package_views drop constraint package_views_package_id_version_fkey;
alter table package_views add constraint package_views_package_id_version_fkey
    foreign key (package_id, version)
    references snapshot (package_id, version)
    on delete set null;

---- create above / drop below ----

delete from package_views where package_id is null;
alter table package_views alter column package_id set not null;
alter table package_views alter column version set not null;
alter table package_views drop constraint package_views_package_id_version_fkey;
alter table package_views add constraint package_views_package_id_version_fkey
    foreign key (package_id, version)
    references snapshot (package_id, version)
    on delete cascade;
