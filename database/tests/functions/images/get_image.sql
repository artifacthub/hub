-- Start transaction and plan tests
begin;
select plan(8);

-- Try getting a non existent image
select is_empty(
    $$ select get_image('00000000-0000-0000-0000-000000000001'::uuid, ''); $$,
    'Image1 does not exist, nothing should be returned'
);

-- Register 2x version of image1
insert into image (image_id, original_hash)
values ('00000000-0000-0000-0000-000000000001'::uuid, 'image1Hash'::bytea);
insert into image_version (image_id, version, data)
values ('00000000-0000-0000-0000-000000000001'::uuid, '2x', 'image12xData'::bytea);

-- Get image version data just registered
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000001', '2x') $$,
    $$ values ('image12xData'::bytea) $$,
    'image1 version 2x data should be returned'
);

-- Register 1x version of image1
insert into image_version (image_id, version, data)
values ('00000000-0000-0000-0000-000000000001'::uuid, '1x', 'image11xData'::bytea);

-- We have two versions of image1 registered now
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000001', '1x') $$,
    $$ values ('image11xData'::bytea) $$,
    'image1 version 1x data should be returned when requesting it'
);
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000001', '') $$,
    $$ values ('image11xData'::bytea) $$,
    'image1 version 1x data should be returned when requesting no specific version'
);
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000001', '20x') $$,
    $$ values ('image11xData'::bytea) $$,
    'image1 version 1x data should be returned when requesting a non existent version'
);

-- Register image2 (svg)
insert into image (image_id, original_hash)
values ('00000000-0000-0000-0000-000000000002'::uuid, 'image2Hash'::bytea);
insert into image_version (image_id, version, data)
values ('00000000-0000-0000-0000-000000000002'::uuid, 'svg', 'image2SvgData'::bytea);

-- Check image was registered
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000002', 'svg') $$,
    $$ values ('image2SvgData'::bytea) $$,
    'image2 svg data should be returned when requesting it'
);
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000002', '') $$,
    $$ values ('image2SvgData'::bytea) $$,
    'image2 svg data should be returned when requesting no specific version'
);
select results_eq(
    $$ select get_image('00000000-0000-0000-0000-000000000002', '2x') $$,
    $$ values ('image2SvgData'::bytea) $$,
    'image2 svg data should be returned when requesting a non existent version'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
