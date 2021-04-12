-- get_webhook returns the webhook identified by the id provided as a json
-- object.
create or replace function get_webhook(p_user_id uuid, p_webhook_id uuid)
returns setof json as $$
begin
    if p_user_id is not null and not user_has_access_to_webhook(p_user_id, p_webhook_id) then
        raise insufficient_privilege;
    end if;

    return query select json_strip_nulls(json_build_object(
        'webhook_id', wh.webhook_id,
        'name', wh.name,
        'description', wh.description,
        'url', wh.url,
        'secret', wh.secret,
        'content_type', wh.content_type,
        'template', wh.template,
        'active', wh.active,
        'event_kinds', (
            select json_agg(event_kind_id)
            from webhook__event_kind wek
            where wek.webhook_id = wh.webhook_id
        ),
        'packages', (
            select json_agg(pkgJSON)
            from (
                select package_id
                from package p
                join webhook__package wp using (package_id)
                where wp.webhook_id = wh.webhook_id
                order by p.name asc
            ) wp
            cross join get_package_summary(jsonb_build_object('package_id', wp.package_id)) as pkgJSON
        ),
        'last_notifications', (
            select json_agg(json_build_object(
                'notification_id', notification_id,
                'created_at', floor(extract(epoch from created_at)),
                'processed', processed,
                'processed_at', floor(extract(epoch from processed_at)),
                'error', error
            ))
            from (
                select *
                from notification
                where webhook_id = p_webhook_id
                order by created_at desc
                limit 10
            ) ln
        )
    ))
    from webhook wh
    where wh.webhook_id = p_webhook_id;
end
$$ language plpgsql;
