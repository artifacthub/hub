-- get_org_webhooks returns the webhooks that belong to the organization
-- provided if the requesting user belongs to it.
create or replace function get_org_webhooks(p_user_id uuid, p_org_name text, p_limit int, p_offset int)
returns table(data json, total_count bigint) as $$
    with org_webhooks as (
        select wh.webhook_id, wh.name
        from webhook wh
        join organization o using (organization_id)
        join user__organization uo using (organization_id)
        where o.name = p_org_name
        and uo.user_id = p_user_id
        and uo.confirmed = true
    )
    select
        coalesce(json_agg(whJSON), '[]'),
        (select count(*) from org_webhooks)
    from (
        select whJSON
        from org_webhooks ow
        cross join get_webhook(null::uuid, ow.webhook_id) as whJSON
        order by ow.name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) whs;
$$ language sql;
