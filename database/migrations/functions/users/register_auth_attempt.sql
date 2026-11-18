-- register_auth_attempt reserves an attempt of the given kind for the user
-- provided. It returns 0 when the attempt is allowed, or the number of seconds
-- to wait otherwise. The allowance follows GCRA: up to p_burst attempts at
-- once, then one every p_interval seconds.
create or replace function register_auth_attempt(
    p_user_id uuid,
    p_kind text,
    p_burst int,
    p_interval int
)
returns int as $$
declare
    v_interval interval := make_interval(secs => p_interval);
    v_limit timestamptz := current_timestamp + (p_burst - 1) * v_interval;
    v_tat timestamptz;
begin
    -- Fast path: allowance exhausted, answer without locking or writing
    select tat into v_tat
    from auth_attempt_limit
    where user_id = p_user_id and kind = p_kind;
    if v_tat > v_limit then
        return ceil(extract(epoch from v_tat - v_limit))::int;
    end if;

    -- Reserve: allowed iff max(tat, now) <= now + (burst - 1) * interval.
    -- Concurrent callers queue on the row lock and re-check the condition on
    -- the newest tat
    insert into auth_attempt_limit as l (user_id, kind, tat)
    values (p_user_id, p_kind, current_timestamp + v_interval)
    on conflict (user_id, kind) do update
    set tat = greatest(l.tat, current_timestamp) + v_interval
    where greatest(l.tat, current_timestamp) <= v_limit;
    if found then
        return 0;
    end if;

    -- Rejected: the statement above holds the row lock, so tat is stable
    select tat into v_tat
    from auth_attempt_limit
    where user_id = p_user_id and kind = p_kind;
    return greatest(1, ceil(extract(epoch from v_tat - v_limit)))::int;
end
$$ language plpgsql;
