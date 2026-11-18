-- refund_auth_attempt gives back to the user provided the attempt of the given
-- kind it has just reserved, once that attempt has succeeded. It never gives
-- back more than one interval and never builds up credit beyond an unused
-- allowance.
create or replace function refund_auth_attempt(p_user_id uuid, p_kind text, p_interval int)
returns void as $$
    update auth_attempt_limit
    set tat = greatest(tat - make_interval(secs => p_interval), current_timestamp)
    where user_id = p_user_id
    and kind = p_kind;
$$ language sql;
