create extension pg_partman;

create table if not exists package_views (
    package_id uuid not null references package on delete cascade,
    version text not null,
    day date not null,
    total integer not null,
    unique (package_id, version, day)
) partition by range (day);

select create_parent('public.package_views', 'day', 'native', 'monthly', p_start_partition := current_date::text);

---- create above / drop below ----

drop table if exists package_views;
drop table template_public_package_views;
delete from part_config where parent_table = 'public.package_views';
