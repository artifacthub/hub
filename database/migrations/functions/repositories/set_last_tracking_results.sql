-- set_last_tracking_results updates the timestamp and errors of the last
-- tracking.
create or replace function set_last_tracking_results(
    p_repository_id uuid,
    p_last_tracking_errors text,
    p_tracking_errors_event_enabled boolean
)
returns void as $$
declare
    v_last_tracking_errors text := nullif(p_last_tracking_errors, '');
    v_prev_last_tracking_errors text;
begin
    -- Register repository tracking errors event if needed
    if p_tracking_errors_event_enabled and v_last_tracking_errors is not null then
        select last_tracking_errors into v_prev_last_tracking_errors
        from repository
        where repository_id = p_repository_id;

        if v_prev_last_tracking_errors is null or v_last_tracking_errors <> v_prev_last_tracking_errors then
            insert into event (repository_id, event_kind_id) values (p_repository_id, 2);
        end if;
    end if;

    -- Update repository with last tracking results
    update repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = v_last_tracking_errors
	where repository_id = p_repository_id;
end
$$ language plpgsql;
