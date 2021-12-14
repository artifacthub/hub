drop extension pg_partman;
create schema partman;
create extension pg_partman schema partman;
drop table template_public_package_views;
select partman.create_parent('public.package_views', 'day', 'native', 'monthly', p_start_partition := current_date::text);

---- create above / drop below ----

drop extension pg_partman;
drop schema partman cascade;
create extension pg_partman;
select create_parent('public.package_views', 'day', 'native', 'monthly', p_start_partition := current_date::text);
