begin;
select plan(9);

-- Test function
select is(
    semver_gt('1.0.0', '0.9.0'),
    true,
    '1.0.0 > 0.9.0 true'
);
select is(
    semver_gt('1.0.0', '1.0.0'),
    false,
    '1.0.0 > 1.0.0 false'
);
select is(
    semver_gt('1.0.0', '1.0.0-rc8'),
    true,
    '1.0.0 > 1.0.0-rc8 true'
);
select is(
    semver_gt('0.0.1', '0.0.2'),
    false,
    '0.0.1 > 0.0.2 false'
);
select is(
    semver_gt('0.10.0', '0.2.0'),
    true,
    '0.10.0 > 0.2.0 true'
);
select is(
    semver_gt('0.2.0', '0.10.0'),
    false,
    '0.2.0 > 0.10.0 false'
);
select is(
    semver_gt('0.2.0-rc1', '0.2.0-rc2'),
    false,
    '0.2.0-rc1 > 0.2.0-rc2 false'
);
select is(
    semver_gt('0.2.0-rc2', '0.2.0-rc1'),
    true,
    '0.2.0-rc2 > 0.2.0-rc1 true'
);
select is(
    semver_gt('0.2.0-rc2', '0.2.0-rc2'),
    false,
    '0.2.0-rc2 > 0.2.0-rc2 false'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
