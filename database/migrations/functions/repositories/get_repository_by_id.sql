-- get_repository_by_id returns the repository identified by the id provided as
-- a json object.
create or replace function get_repository_by_id(p_repository_id uuid, p_include_credentials boolean)
returns setof json as $$
begin
    if p_include_credentials then
        return query
        select json_strip_nulls(json_build_object(
            'repository_id', r.repository_id,
            'name', r.name,
            'display_name', r.display_name,
            'url', r.url,
            'branch', r.branch,
            'auth_user', r.auth_user,
            'auth_pass', r.auth_pass,
            'kind', r.repository_kind_id,
            'verified_publisher', verified_publisher,
            'official', r.official,
            'disabled', r.disabled,
            'scanner_disabled', r.scanner_disabled,
            'digest', r.digest,
            'last_scanning_ts', floor(extract(epoch from last_scanning_ts)),
            'last_scanning_errors', r.last_scanning_errors,
            'last_tracking_ts', floor(extract(epoch from last_tracking_ts)),
            'last_tracking_errors', r.last_tracking_errors,
            'user_alias', u.alias,
            'organization_name', o.name,
            'organization_display_name', o.display_name
        ))
        from repository r
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where repository_id = p_repository_id;
    else
        return query
        select json_strip_nulls(json_build_object(
            'repository_id', r.repository_id,
            'name', r.name,
            'display_name', r.display_name,
            'url', r.url,
            'branch', r.branch,
            'kind', r.repository_kind_id,
            'verified_publisher', verified_publisher,
            'official', r.official,
            'disabled', r.disabled,
            'scanner_disabled', r.scanner_disabled,
            'digest', r.digest,
            'last_scanning_ts', floor(extract(epoch from last_scanning_ts)),
            'last_scanning_errors', r.last_scanning_errors,
            'last_tracking_ts', floor(extract(epoch from last_tracking_ts)),
            'last_tracking_errors', r.last_tracking_errors,
            'user_alias', u.alias,
            'organization_name', o.name,
            'organization_display_name', o.display_name
        ))
        from repository r
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where repository_id = p_repository_id;
    end if;
end
$$ language plpgsql;
