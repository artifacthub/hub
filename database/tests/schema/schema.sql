-- Start transaction and plan tests
begin;
select plan(133);

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
    'opt_out',
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
    'event_kind_id',
    'package_id',
    'package_version',
    'repository_id',
    'data'
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
select columns_are('opt_out', array[
    'opt_out_id',
    'user_id',
    'repository_id',
    'event_kind_id'
]);
select columns_are('organization', array[
    'organization_id',
    'name',
    'display_name',
    'description',
    'home_url',
    'logo_image_id',
    'created_at',
    'authorization_enabled',
    'predefined_policy',
    'custom_policy',
    'policy_data'
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
    'branch',
    'auth_user',
    'auth_pass',
    'last_tracking_ts',
    'last_tracking_errors',
    'verified_publisher',
    'official',
    'disabled',
    'scanner_disabled',
    'digest',
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
    'crds',
    'crds_examples',
    'security_report',
    'security_report_created_at',
    'security_report_summary',
    'capabilities',
    'data',
    'deprecated',
    'license',
    'signed',
    'content_url',
    'containers_images',
    'provider',
    'values_schema',
    'changes',
    'contains_security_updates',
    'prerelease',
    'created_at',
    'recommendations'
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
    'event_not_processed_idx'
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
select indexes_are('opt_out', array[
    'opt_out_pkey',
    'opt_out_user_id_repository_id_event_kind_id_key'
]);
select indexes_are('organization', array[
    'organization_pkey',
    'organization_name_key'
]);
select indexes_are('package', array[
    'package_pkey',
    'package_tsdoc_idx',
    'package_repository_id_idx',
    'package_repository_id_name_key',
    'package_has_logo_image_id_idx'
]);
select indexes_are('package__maintainer', array[
    'package__maintainer_pkey'
]);
select indexes_are('repository', array[
    'repository_pkey',
    'repository_name_key',
    'repository_url_idx',
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
    'snapshot_package_id_digest_key',
    'snapshot_not_deprecated_with_readme_idx'
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
-- API keys
select has_function('add_api_key');
select has_function('delete_api_key');
select has_function('get_api_key');
select has_function('get_user_api_keys');
select has_function('update_api_key');
-- Authz
select has_function('notify_authorization_policies_updates');
-- Events
select has_function('get_pending_event');
-- Images
select has_function('get_image');
select has_function('register_image');
-- Notifications
select has_function('add_notification');
select has_function('get_pending_notification');
select has_function('update_notification_status');
-- Organizations
select has_function('add_organization');
select has_function('add_organization_member');
select has_function('confirm_organization_membership');
select has_function('delete_organization');
select has_function('delete_organization_member');
select has_function('get_authorization_policies');
select has_function('get_authorization_policy');
select has_function('get_organization');
select has_function('get_organization_members');
select has_function('get_user_organizations');
select has_function('update_authorization_policy');
select has_function('update_organization');
select has_function('user_belongs_to_organization');
-- Packages
select has_function('generate_package_tsdoc');
select has_function('get_harbor_replication_dump');
select has_function('get_package');
select has_function('get_package_changelog');
select has_function('get_package_summary');
select has_function('get_packages_starred_by_user');
select has_function('get_package_stars');
select has_function('get_packages_stats');
select has_function('get_random_packages');
select has_function('get_snapshots_to_scan');
select has_function('register_package');
select has_function('search_packages');
select has_function('search_packages_monocular');
select has_function('semver_gt');
select has_function('semver_gte');
select has_function('toggle_star');
select has_function('update_snapshot_security_report');
select has_function('unregister_package');
-- Repositories
select has_function('add_repository');
select has_function('delete_repository');
select has_function('get_all_repositories');
select has_function('get_repositories_by_kind');
select has_function('get_repository_by_id');
select has_function('get_repository_by_name');
select has_function('get_repository_packages_digest');
select has_function('get_repository_summary');
select has_function('get_org_repositories');
select has_function('get_user_repositories');
select has_function('set_last_tracking_results');
select has_function('set_verified_publisher');
select has_function('transfer_repository');
select has_function('update_repository');
-- Subscriptions
select has_function('add_opt_out');
select has_function('add_subscription');
select has_function('delete_opt_out');
select has_function('delete_subscription');
select has_function('get_package_subscriptors');
select has_function('get_repository_subscriptors');
select has_function('get_user_opt_out_entries');
select has_function('get_user_package_subscriptions');
select has_function('get_user_subscriptions');
-- Users
select has_function('check_user_alias_availability');
select has_function('get_user_profile');
select has_function('register_session');
select has_function('register_user');
select has_function('update_user_password');
select has_function('update_user_profile');
select has_function('verify_email');
-- Webhooks
select has_function('add_webhook');
select has_function('delete_webhook');
select has_function('get_webhook');
select has_function('get_org_webhooks');
select has_function('get_user_webhooks');
select has_function('get_webhooks_subscribed_to_package');
select has_function('update_webhook');
select has_function('user_has_access_to_webhook');

-- Check repository kinds exist
select results_eq(
    'select * from repository_kind',
    $$ values
        (0, 'Helm charts'),
        (1, 'Falco rules'),
        (2, 'OPA policies'),
        (3, 'OLM operators'),
        (4, 'Tinkerbell actions'),
        (5, 'Krew kubectl plugins'),
        (6, 'Helm plugins'),
        (7, 'Tekton tasks')
    $$,
    'Repository kinds should exist'
);

-- Check event kinds exist
select results_eq(
    'select * from event_kind',
    $$ values
        (0, 'New package release'),
        (1, 'Security alert'),
        (2, 'Repository tracking errors'),
        (3, 'Repository ownership claim')
    $$,
    'Event kinds should exist'
);

-- Finish tests and rollback transaction
select * from finish();
rollback;
