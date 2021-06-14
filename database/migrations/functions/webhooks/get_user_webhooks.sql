-- get_user_webhooks returns the webhooks that belong to the requesting user.
create or replace function get_user_webhooks(p_user_id uuid, p_limit int, p_offset int)
returns table(data json, total_count bigint) as $$
    with user_webhooks as (
        select webhook_id, name
        from webhook
        where user_id = p_user_id
    )
    select
        coalesce(json_agg(whJSON), '[]'),
        (select count(*) from user_webhooks)
    from (
        select whJSON
        from user_webhooks uw
        cross join get_webhook(null::uuid, uw.webhook_id) as whJSON
        order by uw.name asc
        limit (case when p_limit = 0 then null else p_limit end)
        offset p_offset
    ) whs;
$$ language sql;
