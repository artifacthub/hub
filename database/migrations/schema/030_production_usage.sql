create table if not exists production_usage (
    package_id uuid not null references package on delete cascade,
    organization_id uuid not null references organization on delete cascade,
    primary key (package_id, organization_id)
);

---- create above / drop below ----

drop table if exists production_usage;
