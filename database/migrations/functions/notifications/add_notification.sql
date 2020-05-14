-- add_notification adds the provided notification to the database.
create or replace function add_notification(p_notification jsonb)
returns void as $$
    insert into notification (
        event_id,
        user_id,
        webhook_id
    ) values (
        ((p_notification->'event')->>'event_id')::uuid,
        ((p_notification->'user')->>'user_id')::uuid,
        ((p_notification->'webhook')->>'webhook_id')::uuid
    );
$$ language sql;
