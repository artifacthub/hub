-- get_webhooks_subscribed_to_package returns the webhooks subscribed to the
-- event kind and package provided.
create or replace function get_webhooks_subscribed_to_package(p_event_kind_id integer, p_package_id uuid)
returns setof json as $$
    select coalesce(json_agg(wh), '[]')
    from webhook
    join webhook__event_kind wek using (webhook_id)
    join webhook__package wp using (webhook_id)
    cross join get_webhook(null::uuid, webhook_id) as wh
    where wek.event_kind_id = p_event_kind_id
    and wp.package_id = p_package_id
    and active = true;
$$ language sql;
