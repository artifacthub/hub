-- get_org_webhooks returns the webhooks that belong to the organization
-- provided if the requesting user belongs to it.
create or replace function get_org_webhooks(p_user_id uuid, p_org_name text)
returns setof json as $$
    select coalesce(json_agg(whJSON), '[]')
    from (
        select whJSON
        from webhook wh
        cross join get_webhook(null::uuid, webhook_id) as whJSON
        join organization o using (organization_id)
        join user__organization uo using (organization_id)
        where o.name = p_org_name
        and uo.user_id = p_user_id
        and uo.confirmed = true
        order by wh.name asc
    ) whs;
$$ language sql;
