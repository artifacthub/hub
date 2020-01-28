create or replace function get_chart_repository_packages_digest(p_chart_repository_id uuid)
returns setof json as $$
    select coalesce(json_object_agg(format('%s@%s', p.name, s.version), s.digest), '{}')
    from package p
    join snapshot s using (package_id)
    where p.chart_repository_id = p_chart_repository_id;
$$ language sql;
