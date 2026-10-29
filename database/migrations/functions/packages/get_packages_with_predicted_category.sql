-- get_packages_with_predicted_category returns the packages whose category
-- was predicted as a json array, so that it can be predicted again on full
-- tracker runs. Packages whose prediction didn't result in any category are
-- included as well. The data is built from the latest version of each
-- package.
create or replace function get_packages_with_predicted_category()
returns json as $$
    select coalesce(json_agg(json_strip_nulls(json_build_object(
        'package_id', p.package_id,
        'latest_version', p.latest_version,
        'name', p.name,
        'keywords', s.keywords,
        'description', left(s.description, 1000),
        'category', p.package_category_id
    )) order by p.package_id), '[]')
    from package p
    join snapshot s using (package_id)
    where p.latest_version = s.version
    and p.package_category_source = 'predicted';
$$ language sql;
