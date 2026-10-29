-- get_category_training_data returns one json object per package whose
-- category was provided by the publisher, built from its latest version, to
-- be used to train the package category model. Deprecated packages are
-- excluded. It's run with psql to export the publisher rows of the category
-- train command.
create or replace function get_category_training_data()
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'repository_kind', r.repository_kind_id,
        'repository_name', r.name,
        'name', p.name,
        'description', left(s.description, 1000),
        'keywords', s.keywords,
        'category', p.package_category_id
    ))
    from package p
    join repository r using (repository_id)
    join snapshot s using (package_id)
    where p.latest_version = s.version
    and p.package_category_source = 'publisher'
    and p.package_category_id is not null
    and (s.deprecated is null or s.deprecated = false)
    order by r.name, p.name;
$$ language sql stable;
