-- Start transaction and plan tests
begin;
select plan(4);

-- Test function
select is(
    semver_gte('1.0.0', '0.9.0'),
    true,
    '1.0.0 >= 0.9.0 true'
);
select is(
    semver_gte('0.0.1', '0.0.2'),
    false,
    '0.0.1 >= 0.0.2 false'
);
select is(
    semver_gte('0.2.0', '0.10.0'),
    false,
    '0.2.0 >= 0.10.0 false'
);
select is(
    semver_gte('0.2.0-rc1', '0.2.0-rc2'),
    false,
    '0.2.0-rc1 >= 0.2.0-rc2 false'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
