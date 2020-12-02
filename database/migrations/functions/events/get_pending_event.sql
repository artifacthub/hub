-- get_pending_event returns a pending event if available, updating its
-- processed state if the event is processed successfully. This function should
-- be called from a transaction that should be rolled back if something goes
-- wrong processing the event.
create or replace function get_pending_event()
returns setof json as $$
declare
    v_event_id uuid;
    v_event json;
begin
    -- Get pending event if available
    select event_id, json_strip_nulls(json_build_object(
        'event_id', e.event_id,
        'event_kind', e.event_kind_id,
        'repository_id', e.repository_id,
        'package_id', e.package_id,
        'package_version', e.package_version,
        'data', e.data
    )) into v_event_id, v_event
    from event e
    where e.processed = false
    for update of e skip locked
    limit 1;
    if not found then
        return;
    end if;

    -- Update event processed state
    -- (this will be committed once the event is processed successfully)
    update event set
        processed = true,
        processed_at = current_timestamp
    where event_id = v_event_id;

    return query select v_event;
end
$$ language plpgsql;
