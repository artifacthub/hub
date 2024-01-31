begin;
select plan(21);

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
    semver_gt('1.0.0', '2.0.0'),
    false,
    '1.0.0 > 2.0.0 false'
);
select is(
    semver_gt('2.0.0', '2.1.0'),
    false,
    '2.0.0 > 2.1.0 false'
);
select is(
    semver_gt('2.1.0', '2.1.1'),
    false,
    '2.1.0 > 2.1.1 false'
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
select is(
    semver_gt('1.15.0-rc.0.363.g22e8adef', '1.15.0-rc.0.9.ged19cd5d'),
    true,
    '1.15.0-rc.0.363.g22e8adef > 1.15.0-rc.0.9.ged19cd5d true'
);
select is(
    semver_gt('1.0.0-alpha', '1.0.0-alpha.1'),
    false,
    '1.0.0-alpha > 1.0.0-alpha.1 false'
);
select is(
    semver_gt('1.0.0-alpha.1', '1.0.0-alpha.beta'),
    false,
    '1.0.0-alpha.1 > 1.0.0-alpha.beta false'
);
select is(
    semver_gt('1.0.0-alpha.beta', '1.0.0-beta'),
    false,
    '1.0.0-alpha.beta > 1.0.0-beta false'
);
select is(
    semver_gt('1.0.0-beta', '1.0.0-beta.2'),
    false,
    '1.0.0-beta > 1.0.0-beta.2 false'
);
select is(
    semver_gt('1.0.0-beta.2', '1.0.0-beta.11'),
    false,
    '1.0.0-beta.2 > 1.0.0-beta.11 false'
);
select is(
    semver_gt('1.0.0-beta.21', '1.0.0-beta.11'),
    true,
    '1.0.0-beta.21 > 1.0.0-beta.11 true'
);
select is(
    semver_gt('1.0.0-beta.11', '1.0.0-rc.1'),
    false,
    '1.0.0-beta.11 > 1.0.0-rc.1 false'
);
select is(
    semver_gt('1.0.0-rc.1', '1.0.0'),
    false,
    '1.0.0-rc.1 > 1.0.0 false'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
