-- delete_subscription deletes the provided subscription from the database.
create or replace function delete_subscription(p_subscription jsonb)
returns void as $$
    delete from subscription
    where user_id = (p_subscription->>'user_id')::uuid
    and package_id = (p_subscription->>'package_id')::uuid
    and event_kind_id = (p_subscription->>'event_kind')::int;
$$ language sql;
