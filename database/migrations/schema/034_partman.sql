create schema partman;
create extension if not exists pg_partman schema partman;

do language plpgsql $$
declare
    v_pg_partman_version text;
begin
    select extversion from pg_extension where extname = 'pg_partman' into v_pg_partman_version;
    case
        when starts_with(v_pg_partman_version, '4.') then
            perform partman.create_parent(
                'public.package_views',
                'day',
                'native',
                'monthly',
                p_start_partition := current_date::text
            );
        when starts_with(v_pg_partman_version, '5.') then
            perform partman.create_parent(
                'public.package_views',
                'day',
                '1 month',
                p_start_partition := current_date::text
            );
        else
            raise exception 'pg_partman version not supported';
    end case;
end
$$;

---- create above / drop below ----

drop extension pg_partman;
drop schema partman cascade;
