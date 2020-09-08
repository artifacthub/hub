-- get_org_repositories returns all available repositories that belong to the
-- provided organization as a json array. The user provided must belong to the
-- organization used.
create or replace function get_org_repositories(p_user_id uuid, p_org_name text)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', r.repository_id,
        'name', r.name,
        'display_name', r.display_name,
        'url', r.url,
        'kind', r.repository_kind_id,
        'verified_publisher', verified_publisher,
        'official', r.official,
        'last_tracking_ts', floor(extract(epoch from r.last_tracking_ts)),
        'last_tracking_errors', r.last_tracking_errors
    )), '[]')
    from repository r
    join organization o using (organization_id)
    join user__organization uo using (organization_id)
    where o.name = p_org_name
    and uo.user_id = p_user_id
    and uo.confirmed = true;
$$ language sql;
