-- Start transaction and plan tests
begin;
select plan(11);

-- Try registering an image version with empty version
select throws_ok(
    $$ select register_image('image1Hash'::bytea, '', 'image1Data'::bytea); $$,
    23514,
    'new row for relation "image_version" violates check constraint "image_version_version_check"',
    'A non empty version is required to register an image'
);

-- Register image1 version 2x
select register_image('image1Hash'::bytea, '2x', 'image12xData'::bytea) as image1_id \gset

-- Image1 2x has been registered
select is(
    image_id,
    :'image1_id',
    'Returned image id should be registered'
) from image where original_hash = 'image1Hash'::bytea;
select results_eq(
    'select original_hash from image',
    $$ values ('image1Hash'::bytea) $$,
    'image1 parent image should be registered'
);
select results_eq(
    'select version, data from image_version',
    $$ values ('2x', 'image12xData'::bytea) $$,
    'image1 version 2x should be registered'
);
select lives_ok(
    $$ select register_image('image1Hash'::bytea, '2x', 'image12xData'::bytea) $$,
    'Registering again image1 2x is ok, it will be a noop'
);
select lives_ok(
    $$ select register_image('image1Hash'::bytea, '2x', 'image12xNewData'::bytea) $$,
    'Registering again image1 2x with different data is ok, it will be a noop'
);
select results_eq(
    'select version, data from image_version',
    $$ values ('2x', 'image12xData'::bytea) $$,
    'image1 version 2x has not changed after the previous insert operation'
);

-- Register image1 version 4x
select register_image('image1Hash'::bytea, '4x', 'image14xData'::bytea);

-- Check new version was registered
select results_eq(
    'select original_hash from image',
    $$ values ('image1Hash'::bytea) $$,
    'image1 should be the only parent image registered'
);
select results_eq(
    'select version, data from image_version',
    $$ values
        ('2x', 'image12xData'::bytea),
        ('4x', 'image14xData'::bytea)
    $$,
    'Image1 versions 2x and 4x found'
);

-- Register now image2 version 3x
select register_image('image2Hash'::bytea, '3x', 'image23xData'::bytea);

-- Check new image was registered
select results_eq(
    'select original_hash from image',
    $$ values
        ('image1Hash'::bytea),
        ('image2Hash'::bytea)
    $$,
    'Two parent images expected now, image1 and image2'
);
select results_eq(
    'select version, data from image_version',
    $$ values
        ('2x', 'image12xData'::bytea),
        ('4x', 'image14xData'::bytea),
        ('3x', 'image23xData'::bytea)
    $$,
    'Three versions from two different images found'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
