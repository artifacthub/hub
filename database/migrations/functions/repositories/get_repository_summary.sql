-- get_repository_summary returns some details about the repository identified
-- by the id provided as a json object.
create or replace function get_repository_summary(p_repository_id uuid)
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'repository_id', r.repository_id,
        'name', r.name,
        'display_name', r.display_name,
        'url', r.url,
        'branch', r.branch,
        'private', (
            case when r.auth_user is not null or r.auth_pass is not null then true
            else false end
        ),
        'kind', r.repository_kind_id,
        'verified_publisher', verified_publisher,
        'official', r.official,
        'cncf', r.cncf,
        'scanner_disabled', r.scanner_disabled,
        'user_alias', u.alias,
        'organization_name', o.name,
        'organization_display_name', o.display_name
    ))
    from repository r
    left join "user" u using (user_id)
    left join organization o using (organization_id)
    where repository_id = p_repository_id;
$$ language sql;
