-- get_org_chart_repositories returns all available chart repositories that
-- belong to the provided organization as a json array. The user provided must
-- belong to the organization used.
create or replace function get_org_chart_repositories(p_user_id uuid, p_org_name text)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'chart_repository_id', cr.chart_repository_id,
        'name', cr.name,
        'display_name', cr.display_name,
        'url', cr.url,
        'last_tracking_ts', floor(extract(epoch from cr.last_tracking_ts)),
        'last_tracking_errors', cr.last_tracking_errors
    )), '[]')
    from chart_repository cr
    join organization o using (organization_id)
    join user__organization uo using (organization_id)
    where o.name = p_org_name
    and uo.user_id = p_user_id
    and uo.confirmed = true;
$$ language sql;
