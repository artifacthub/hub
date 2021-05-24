-- Start transaction and plan tests
begin;
select plan(5);

-- Run some tests
select is(
    are_all_containers_images_whitelisted('[
        {"image": "quay.io/org/img:1.0.0", "whitelisted": true}
    ]'),
    true
);
select is(
    are_all_containers_images_whitelisted('[
        {"image": "quay.io/org/img:1.0.0", "whitelisted": true},
        {"image": "quay.io/org/img-sidecar:1.0.0", "whitelisted": true}
    ]'),
    true
);
select is(
    are_all_containers_images_whitelisted('[
        {"image": "quay.io/org/img:1.0.0", "whitelisted": true},
        {"image": "quay.io/org/img-sidecar:1.0.0", "whitelisted": false}
    ]'),
    false
);
select is(
    are_all_containers_images_whitelisted('[
        {"image": "quay.io/org/img:1.0.0", "whitelisted": false}
    ]'),
    false
);
select is(
    are_all_containers_images_whitelisted('[
        {"image": "quay.io/org/img:1.0.0"}
    ]'),
    null
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
