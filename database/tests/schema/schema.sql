-- Start transaction and plan tests
begin;
select plan(111);

-- Check default_text_search_config is correct
select results_eq(
    $$ select current_setting('default_text_search_config')::text $$,
    $$ values ('pg_catalog.simple'::text) $$,
    'default_text_search_config is pg_catalog.simple'
);

-- Check pgcrypto extension exist
select has_extension('pgcrypto');

-- Check expected tables exist
select tables_are(array[
    'api_key',
    'email_verification_code',
    'event',
    'event_kind',
    'image',
    'image_version',
    'maintainer',
    'notification',
    'organization',
    'package',
    'package__maintainer',
    'repository',
    'repository_kind',
    'session',
    'snapshot',
    'subscription',
    'user',
    'user_starred_package',
    'user__organization',
    'version_functions',
    'version_schema',
    'webhook',
    'webhook__event_kind',
    'webhook__package'
]);

-- Check tables have expected columns
select columns_are('api_key', array[
    'api_key_id',
    'name',
    'key',
    'user_id',
    'created_at'
]);
select columns_are('email_verification_code', array[
    'email_verification_code_id',
    'user_id',
    'created_at'
]);
select columns_are('event', array[
    'event_id',
    'created_at',
    'processed',
    'processed_at',
    'package_version',
    'package_id',
    'event_kind_id'
]);
select columns_are('event_kind', array[
    'event_kind_id',
    'name'
]);
select columns_are('image', array[
    'image_id',
    'original_hash'
]);
select columns_are('image_version', array[
    'image_id',
    'version',
    'data'
]);
select columns_are('maintainer', array[
    'maintainer_id',
    'name',
    'email'
]);
select columns_are('notification', array[
    'notification_id',
    'created_at',
    'processed',
    'processed_at',
    'error',
    'event_id',
    'user_id',
    'webhook_id'
]);
select columns_are('organization', array[
    'organization_id',
    'name',
    'display_name',
    'description',
    'home_url',
    'logo_image_id',
    'created_at'
]);
select columns_are('package', array[
    'package_id',
    'name',
    'normalized_name',
    'latest_version',
    'logo_url',
    'logo_image_id',
    'stars',
    'tsdoc',
    'is_operator',
    'channels',
    'default_channel',
    'repository_id'
]);
select columns_are('package__maintainer', array[
    'package_id',
    'maintainer_id'
]);
select columns_are('repository', array[
    'repository_id',
    'name',
    'display_name',
    'url',
    'last_tracking_ts',
    'last_tracking_errors',
    'repository_kind_id',
    'user_id',
    'organization_id'
]);
select columns_are('repository_kind', array[
    'repository_kind_id',
    'name'
]);
select columns_are('session', array[
    'session_id',
    'user_id',
    'ip',
    'user_agent',
    'created_at'
]);
select columns_are('snapshot', array[
    'package_id',
    'version',
    'display_name',
    'description',
    'keywords',
    'home_url',
    'app_version',
    'digest',
    'readme',
    'install',
    'links',
    'data',
    'deprecated',
    'license',
    'signed',
    'content_url',
    'container_image',
    'provider',
    'created_at'
]);
select columns_are('subscription', array[
    'user_id',
    'package_id',
    'event_kind_id'
]);
select columns_are('user', array[
    'user_id',
    'alias',
    'first_name',
    'last_name',
    'email',
    'email_verified',
    'password',
    'profile_image_id',
    'created_at'
]);
select columns_are('user_starred_package', array[
    'user_id',
    'package_id'
]);
select columns_are('user__organization', array[
    'user_id',
    'organization_id',
    'confirmed'
]);
select columns_are('version_functions', array[
    'version'
]);
select columns_are('version_schema', array[
    'version'
]);
select columns_are('webhook', array[
    'webhook_id',
    'name',
    'description',
    'url',
    'secret',
    'content_type',
    'template',
    'active',
    'created_at',
    'updated_at',
    'user_id',
    'organization_id'
]);
select columns_are('webhook__event_kind', array[
    'webhook_id',
    'event_kind_id'
]);
select columns_are('webhook__package', array[
    'webhook_id',
    'package_id'
]);

-- Check tables have expected indexes
select indexes_are('api_key', array[
    'api_key_pkey',
    'api_key_user_id_idx'
]);
select indexes_are('email_verification_code', array[
    'email_verification_code_pkey',
    'email_verification_code_user_id_key'
]);
select indexes_are('event', array[
    'event_pkey',
    'event_not_processed_idx',
    'event_package_id_package_version_event_kind_id_key'
]);
select indexes_are('image', array[
    'image_pkey',
    'image_original_hash_key'
]);
select indexes_are('image_version', array[
    'image_version_pkey'
]);
select indexes_are('maintainer', array[
    'maintainer_pkey',
    'maintainer_email_key'
]);
select indexes_are('notification', array[
    'notification_pkey',
    'notification_not_processed_idx',
    'notification_event_id_user_id_key',
    'notification_event_id_webhook_id_key',
    'notification_webhook_id_created_at_idx'
]);
select indexes_are('organization', array[
    'organization_pkey',
    'organization_name_key'
]);
select indexes_are('package', array[
    'package_pkey',
    'package_tsdoc_idx',
    'package_repository_id_idx',
    'package_repository_id_name_key'
]);
select indexes_are('package__maintainer', array[
    'package__maintainer_pkey'
]);
select indexes_are('repository', array[
    'repository_pkey',
    'repository_name_key',
    'repository_url_key',
    'repository_repository_kind_id_idx',
    'repository_user_id_idx',
    'repository_organization_id_idx'
]);
select indexes_are('repository_kind', array[
    'repository_kind_pkey'
]);
select indexes_are('session', array[
    'session_pkey'
]);
select indexes_are('snapshot', array[
    'snapshot_pkey',
    'snapshot_package_id_digest_key'
]);
select indexes_are('subscription', array[
    'subscription_pkey'
]);
select indexes_are('user', array[
    'user_pkey',
    'user_alias_key',
    'user_email_key'
]);
select indexes_are('user__organization', array[
    'user__organization_pkey'
]);
select indexes_are('user_starred_package', array[
    'user_starred_package_pkey'
]);
select indexes_are('webhook', array[
    'webhook_pkey',
    'webhook_user_id_idx',
    'webhook_organization_id_idx'
]);
select indexes_are('webhook__event_kind', array[
    'webhook__event_kind_pkey'
]);
select indexes_are('webhook__package', array[
    'webhook__package_pkey'
]);

-- Check expected functions exist
select has_function('add_api_key');
select has_function('delete_api_key');
select has_function('get_api_key');
select has_function('get_user_api_keys');
select has_function('update_api_key');

select has_function('get_pending_event');

select has_function('get_image');
select has_function('register_image');

select has_function('add_notification');
select has_function('get_pending_notification');
select has_function('update_notification_status');

select has_function('add_organization');
select has_function('add_organization_member');
select has_function('confirm_organization_membership');
select has_function('delete_organization_member');
select has_function('get_organization');
select has_function('get_organization_members');
select has_function('get_user_organizations');
select has_function('update_organization');
select has_function('user_belongs_to_organization');

select has_function('generate_package_tsdoc');
select has_function('get_package');
select has_function('get_package_summary');
select has_function('get_packages_starred_by_user');
select has_function('get_package_stars');
select has_function('get_packages_stats');
select has_function('get_random_packages');
select has_function('register_package');
select has_function('search_packages');
select has_function('semver_gt');
select has_function('semver_gte');
select has_function('toggle_star');
select has_function('unregister_package');

select has_function('add_repository');
select has_function('delete_repository');
select has_function('get_repositories_by_kind');
select has_function('get_repository_by_name');
select has_function('get_repository_packages_digest');
select has_function('get_org_repositories');
select has_function('get_user_repositories');
select has_function('transfer_repository');
select has_function('update_repository');

select has_function('add_subscription');
select has_function('delete_subscription');
select has_function('get_package_subscriptions');
select has_function('get_subscriptors');
select has_function('get_user_subscriptions');

select has_function('get_user_profile');
select has_function('register_session');
select has_function('register_user');
select has_function('update_user_password');
select has_function('update_user_profile');
select has_function('verify_email');

select has_function('add_webhook');
select has_function('delete_webhook');
select has_function('get_webhook');
select has_function('get_org_webhooks');
select has_function('get_user_webhooks');
select has_function('get_webhooks_subscribed_to');
select has_function('update_webhook');
select has_function('user_has_access_to_webhook');

-- Check repository kinds exist
select results_eq(
    'select * from repository_kind',
    $$ values
        (0, 'Helm charts'),
        (1, 'Falco rules'),
        (2, 'OPA policies'),
        (3, 'OLM operators')
    $$,
    'Repository kinds should exist'
);

-- Check event kinds exist
select results_eq(
    'select * from event_kind',
    $$ values
        (0, 'New package release'),
        (1, 'Security alert')
    $$,
    'Event kinds should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
