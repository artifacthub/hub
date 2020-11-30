-- get_pending_notification returns a pending notification if available.
create or replace function get_pending_notification()
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'notification_id', n.notification_id,
        'event', json_build_object(
            'event_id', e.event_id,
            'event_kind', e.event_kind_id,
            'repository_id', e.repository_id,
            'package_id', e.package_id,
            'package_version', e.package_version
        ),
        'user', (select nullif(
            jsonb_build_object(
                'email', u.email
            ),
            '{"email": null}'::jsonb
        )),
        'webhook', (select nullif(
            jsonb_build_object(
                'name', wh.name,
                'url', wh.url,
                'secret', wh.secret,
                'content_type', wh.content_type,
                'template', wh.template
            ),
            '{"name": null, "url": null, "secret": null, "content_type": null, "template": null}'::jsonb
        ))
    ))
    from notification n
    join event e using (event_id)
    left join "user" u using (user_id)
    left join webhook wh using (webhook_id)
    where n.processed = false
    for update of n skip locked
    limit 1;
$$ language sql;
