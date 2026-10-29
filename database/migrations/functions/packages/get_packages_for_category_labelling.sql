-- get_packages_for_category_labelling returns one json object per package,
-- built from its latest version, with the data needed to label its category
-- using an LLM. Deprecated packages are excluded. It's run with psql to export
-- the input of the category labelling tool.
create or replace function get_packages_for_category_labelling()
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'package_id', p.package_id,
        'repository_kind', r.repository_kind_id,
        'repository_name', r.name,
        'name', p.name,
        'description', left(s.description, 1000),
        'keywords', s.keywords,
        'readme', left(s.readme, 16384)
    ))
    from package p
    join repository r using (repository_id)
    join snapshot s using (package_id)
    where p.latest_version = s.version
    and (s.deprecated is null or s.deprecated = false)
    order by r.name, p.name;
$$ language sql stable;
