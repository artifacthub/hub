alter table package_views drop constraint package_views_package_id_fkey;
alter table package_views add constraint package_views_package_id_version_fkey
    foreign key (package_id, version)
    references snapshot (package_id, version)
    on delete cascade;

---- create above / drop below ----

alter table package_views drop constraint package_views_package_id_version_fkey;
alter table package_views add constraint package_views_package_id_fkey
    foreign key (package_id)
    references package (package_id)
    on delete cascade;
