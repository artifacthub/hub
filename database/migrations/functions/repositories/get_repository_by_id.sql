-- get_repository_by_id returns the repository identified by the id provided as
-- a json object.
create or replace function get_repository_by_id(p_repository_id uuid)
returns setof json as $$
    select json_build_object(
        'repository_id', r.repository_id,
        'name', r.name,
        'display_name', r.display_name,
        'url', r.url,
        'kind', r.repository_kind_id,
        'last_tracking_errors', r.last_tracking_errors,
        'user_alias', u.alias,
        'organization_name', o.name
    )
    from repository r
    left join "user" u using (user_id)
    left join organization o using (organization_id)
    where repository_id = p_repository_id;
$$ language sql;
