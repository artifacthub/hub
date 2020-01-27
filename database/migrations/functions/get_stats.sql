create or replace function get_stats()
returns setof json as $$
    select json_build_object(
        'packages', (select count(*) from package),
        'releases', (select count(*) from snapshot)
    );
$$ language sql;
