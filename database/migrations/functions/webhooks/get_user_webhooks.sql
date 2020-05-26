-- get_user_webhooks returns the webhooks that belong to the requesting user.
create or replace function get_user_webhooks(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(whJSON), '[]')
    from (
        select whJSON
        from webhook wh
        cross join get_webhook(null::uuid, webhook_id) as whJSON
        where user_id = p_user_id
        order by wh.name asc
    ) whs;
$$ language sql;
