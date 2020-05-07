-- get_pending_notification returns a pending notification if available,
-- updating its processed state if the notification is delivered successfully.
-- This function should be called from a transaction that should be rolled back
-- if the notification is not delivered successfully.
create or replace function get_pending_notification()
returns setof json as $$
declare
    v_notification_id uuid;
    v_notification json;
begin
    -- Get pending notification if available
    select notification_id, json_build_object(
        'notification_id', n.notification_id,
        'package_version', n.package_version,
        'package_id', n.package_id,
        'notification_kind', n.notification_kind_id
    ) into v_notification_id, v_notification
    from notification n
    where n.processed = false
    for update of n skip locked
    limit 1;
    if not found then
        return;
    end if;

    -- Update notification processed state
    -- (this will be committed once the notification is delivered successfully)
    update notification set
        processed = true,
        processed_at = current_timestamp
    where notification_id = v_notification_id;

    return query select v_notification;
end
$$ language plpgsql;
