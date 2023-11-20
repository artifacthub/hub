create index if not exists event_repository_id_idx on event (repository_id);
create index if not exists event_package_id_idx on event (package_id);

---- create above / drop below ----

drop index if exists event_repository_id_idx;
drop index if exists event_package_id_idx;
