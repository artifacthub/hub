-- get_repository_by_id returns the repository identified by the id provided as
-- a json object.
create or replace function get_repository_by_id(p_repository_id uuid, p_include_credentials boolean)
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'repository_id', r.repository_id,
        'name', r.name,
        'display_name', r.display_name,
        'url', r.url,
        'branch', r.branch,
        'private', (case when r.auth_user is not null or r.auth_pass is not null then true else null end),
        'auth_user', (case when p_include_credentials then r.auth_user else null end),
        'auth_pass', (case when p_include_credentials then r.auth_pass else null end),
        'kind', r.repository_kind_id,
        'verified_publisher', r.verified_publisher,
        'official', r.official,
        'disabled', r.disabled,
        'scanner_disabled', r.scanner_disabled,
        'digest', r.digest,
        'last_scanning_ts', floor(extract(epoch from r.last_scanning_ts)),
        'last_scanning_errors', r.last_scanning_errors,
        'last_tracking_ts', floor(extract(epoch from r.last_tracking_ts)),
        'last_tracking_errors', r.last_tracking_errors,
        'data', r.data,
        'user_alias', u.alias,
        'organization_name', o.name,
        'organization_display_name', o.display_name
    ))
    from repository r
    left join "user" u using (user_id)
    left join organization o using (organization_id)
    where repository_id = p_repository_id;
$$ language sql;
