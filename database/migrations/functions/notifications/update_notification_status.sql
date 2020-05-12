-- update_notification_status updates the status of the provided notification.
create or replace function update_notification_status(
    p_notification_id uuid,
    p_processed boolean,
    p_error text
) returns void as $$
    update notification set
        processed = p_processed,
        processed_at = current_timestamp,
        error = nullif(p_error, '')
    where notification_id = p_notification_id;
$$ language sql;
