-- Start transaction and plan tests
begin;
select plan(2);

-- Test function
select is(
    is_latest(
        0,
        '1.0.1',
        '1.0.0',
        current_timestamp - '2 days'::interval,
        current_timestamp - '1 day'::interval
    ),
    true
);
select is(
    is_latest(
        12,
        '1.0.1',
        '1.0.0',
        current_timestamp - '2 days'::interval,
        current_timestamp - '1 day'::interval
    ),
    false
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
