with new_tsdoc as (
    select
        p.package_id,
        (
            setweight(to_tsvector(p.name), 'A') ||
            setweight(to_tsvector(coalesce(s.display_name, '')), 'A') ||
            setweight(to_tsvector(coalesce(s.description, '')), 'B') ||
            setweight(to_tsvector(array_to_string(coalesce(s.keywords, '{}'), ' ')), 'C') ||
            setweight(to_tsvector(array_to_string(coalesce(array[r.name, r.display_name], '{}'), ' ')), 'B') ||
            setweight(to_tsvector(array_to_string(coalesce(array[u.alias, o.name, o.display_name, s.provider], '{}'), ' ')), 'B')
        ) as tsdoc
    from package p
    join snapshot s using (package_id)
    join repository r using (repository_id)
    left join "user" u using (user_id)
    left join organization o using (organization_id)
    where s.version = p.latest_version
)
update package
set tsdoc = new_tsdoc.tsdoc
from new_tsdoc
where package.package_id = new_tsdoc.package_id;

---- create above / drop below ----
