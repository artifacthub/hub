create extension if not exists pg_trgm;
create index repository_name_idx on repository using gin (name gin_trgm_ops);
drop function if exists get_all_repositories(boolean);
drop function if exists get_org_repositories(uuid, text, boolean);
drop function if exists get_repositories_by_kind(int, boolean);
drop function if exists get_user_repositories(uuid, boolean);

---- create above / drop below ----

drop index if exists repository_name_idx;
