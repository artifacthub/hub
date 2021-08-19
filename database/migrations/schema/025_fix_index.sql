drop index snapshot_not_deprecated_with_readme_idx;
create index snapshot_not_deprecated_with_readme_idx on snapshot (package_id, version) include (ts)
where (deprecated is null or deprecated = false) and readme is not null;

---- create above / drop below ----

drop index snapshot_not_deprecated_with_readme_idx;
create index snapshot_not_deprecated_with_readme_idx on snapshot (package_id, version) include (created_at)
where (deprecated is null or deprecated = false) and readme is not null;
