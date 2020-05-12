-- get_pending_notification returns a pending notification if available.
create or replace function get_pending_notification()
returns setof json as $$
    select json_build_object(
        'notification_id', n.notification_id,
        'event', json_build_object(
            'event_id', e.event_id,
            'event_kind', e.event_kind_id,
            'package_id', e.package_id,
            'package_version', e.package_version
        ),
        'user', json_build_object(
            'email', u.email
        )
    )
    from notification n
    join event e using (event_id)
    join "user" u using (user_id)
    where n.processed = false
    for update of n skip locked
    limit 1;
$$ language sql;
