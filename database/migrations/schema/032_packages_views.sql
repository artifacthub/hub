create table if not exists package_views (
    package_id uuid not null references package on delete cascade,
    version text not null,
    day date not null,
    total integer not null,
    unique (package_id, version, day)
) partition by range (day);

---- create above / drop below ----

drop table if exists package_views;
