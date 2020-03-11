-- get_packages_stats returns the number of packages and releases registered in
-- the database as a json object.
create or replace function get_packages_stats()
returns setof json as $$
    select json_build_object(
        'packages', (select count(*) from package),
        'releases', (select count(*) from snapshot)
    );
$$ language sql;
