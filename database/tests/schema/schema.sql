-- Start transaction and plan tests
begin;
select plan(28);

-- Check default_text_search_config is correct
select results_eq(
    $$ select current_setting('default_text_search_config')::text $$,
    $$ values ('pg_catalog.english'::text) $$,
    'default_text_search_config is pg_catalog.english'
);

-- Check uuid extension exist
select has_extension('uuid-ossp');

-- Check expected tables exist
select tables_are(array[
    'chart_repository',
    'maintainer',
    'package',
    'package__maintainer',
    'package_kind',
    'schema_version',
    'snapshot'
]);

-- Check tables have expected columns
select columns_are('chart_repository', array[
    'chart_repository_id',
    'name',
    'display_name',
    'url'
]);
select columns_are('maintainer', array[
    'maintainer_id',
    'name',
    'email'
]);
select columns_are('package', array[
    'package_id',
    'name',
    'display_name',
    'description',
    'home_url',
    'logo_url',
    'keywords',
    'latest_version',
    'created_at',
    'updated_at',
    'tsdoc',
    'package_kind_id',
    'chart_repository_id'
]);
select columns_are('package__maintainer', array[
    'package_id',
    'maintainer_id'
]);
select columns_are('package_kind', array[
    'package_kind_id',
    'name'
]);
select columns_are('schema_version', array[
    'version'
]);
select columns_are('snapshot', array[
    'package_id',
    'version',
    'app_version',
    'digest',
    'readme',
    'links'
]);

-- Check tables have expected indexes
select indexes_are('chart_repository', array[
    'chart_repository_pkey',
    'chart_repository_name_key',
    'chart_repository_url_key'
]);
select indexes_are('maintainer', array[
    'maintainer_pkey',
    'maintainer_email_key'
]);
select indexes_are('package', array[
    'package_pkey',
    'package_chart_repository_id_name_key',
    'package_chart_repository_id_idx',
    'package_package_kind_id_idx',
    'package_tsdoc_idx',
    'package_created_at_idx',
    'package_updated_at_idx'
]);
select indexes_are('package__maintainer', array[
    'package__maintainer_pkey'
]);
select indexes_are('package_kind', array[
    'package_kind_pkey'
]);
select indexes_are('snapshot', array[
    'snapshot_pkey'
]);

-- Check expected functions exist
select has_function('generate_package_tsdoc');
select has_function('semver_gte');
select has_function('get_chart_repositories');
select has_function('get_chart_repository_by_name');
select has_function('get_chart_repository_packages_digest');
select has_function('register_package');
select has_function('get_stats');
select has_function('search_packages');
select has_function('get_package_version');
select has_function('get_package');
select has_function('get_packages_updates');

-- Check package kinds exist
SELECT results_eq(
    'select * from package_kind',
    $$ values (0, 'chart') $$,
    'Package kinds should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
