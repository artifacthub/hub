{{ template "repositories/get_repository_by_id.sql" }}
{{ template "repositories/get_repository_summary.sql" }}

{{ template "api_keys/add_api_key.sql" }}
{{ template "api_keys/delete_api_key.sql" }}
{{ template "api_keys/get_api_key.sql" }}
{{ template "api_keys/get_user_api_keys.sql" }}
{{ template "api_keys/update_api_key.sql" }}

{{ template "events/get_pending_event.sql" }}

{{ template "images/get_image.sql" }}
{{ template "images/register_image.sql" }}

{{ template "notifications/add_notification.sql" }}
{{ template "notifications/get_pending_notification.sql" }}
{{ template "notifications/update_notification_status.sql" }}

{{ template "organizations/add_organization_member.sql" }}
{{ template "organizations/add_organization.sql" }}
{{ template "organizations/confirm_organization_membership.sql" }}
{{ template "organizations/delete_organization.sql" }}
{{ template "organizations/delete_organization_member.sql" }}
{{ template "organizations/get_authorization_policies.sql" }}
{{ template "organizations/get_authorization_policy.sql" }}
{{ template "organizations/get_organization.sql" }}
{{ template "organizations/get_organization_members.sql" }}
{{ template "organizations/get_user_organizations.sql" }}
{{ template "organizations/update_authorization_policy.sql" }}
{{ template "organizations/update_organization.sql" }}
{{ template "organizations/user_belongs_to_organization.sql" }}

{{ template "packages/add_production_usage.sql" }}
{{ template "packages/are_all_containers_images_whitelisted.sql" }}
{{ template "packages/delete_production_usage.sql" }}
{{ template "packages/enrich_package_data.sql" }}
{{ template "packages/generate_package_tsdoc.sql" }}
{{ template "packages/get_harbor_replication_dump.sql" }}
{{ template "packages/get_helm_exporter_dump.sql" }}
{{ template "packages/get_nova_dump.sql" }}
{{ template "packages/get_package.sql" }}
{{ template "packages/get_package_changelog.sql" }}
{{ template "packages/get_package_summary.sql" }}
{{ template "packages/get_packages_starred_by_user.sql" }}
{{ template "packages/get_package_stars.sql" }}
{{ template "packages/get_package_views.sql" }}
{{ template "packages/get_packages_stats.sql" }}
{{ template "packages/get_production_usage.sql" }}
{{ template "packages/get_random_packages.sql" }}
{{ template "packages/get_snapshots_to_scan.sql" }}
{{ template "packages/is_latest.sql" }}
{{ template "packages/register_package.sql" }}
{{ template "packages/search_packages.sql" }}
{{ template "packages/search_packages_monocular.sql" }}
{{ template "packages/semver_gt.sql" }}
{{ template "packages/semver_gte.sql" }}
{{ template "packages/toggle_star.sql" }}
{{ template "packages/unregister_package.sql" }}
{{ template "packages/update_packages_views.sql" }}
{{ template "packages/update_snapshot_security_report.sql" }}

{{ template "repositories/add_repository.sql" }}
{{ template "repositories/delete_repository.sql" }}
{{ template "repositories/get_repository_by_name.sql" }}
{{ template "repositories/get_repository_packages_digest.sql" }}
{{ template "repositories/search_repositories.sql" }}
{{ template "repositories/set_last_scanning_results.sql" }}
{{ template "repositories/set_last_tracking_results.sql" }}
{{ template "repositories/set_verified_publisher.sql" }}
{{ template "repositories/transfer_repository.sql" }}
{{ template "repositories/update_repository.sql" }}

{{ template "stats/get_stats.sql" }}

{{ template "subscriptions/add_opt_out.sql" }}
{{ template "subscriptions/add_subscription.sql" }}
{{ template "subscriptions/delete_opt_out.sql" }}
{{ template "subscriptions/delete_subscription.sql" }}
{{ template "subscriptions/get_package_subscriptors.sql" }}
{{ template "subscriptions/get_repository_subscriptors.sql" }}
{{ template "subscriptions/get_user_opt_out_entries.sql" }}
{{ template "subscriptions/get_user_package_subscriptions.sql" }}
{{ template "subscriptions/get_user_subscriptions.sql" }}

{{ template "users/approve_session.sql" }}
{{ template "users/delete_user.sql" }}
{{ template "users/get_user_profile.sql" }}
{{ template "users/get_user_tfa_config.sql" }}
{{ template "users/register_delete_user_code.sql" }}
{{ template "users/register_password_reset_code.sql" }}
{{ template "users/register_session.sql" }}
{{ template "users/register_user.sql" }}
{{ template "users/reset_user_password.sql" }}
{{ template "users/update_user_password.sql" }}
{{ template "users/update_user_profile.sql" }}
{{ template "users/verify_email.sql" }}
{{ template "users/verify_password_reset_code.sql" }}

{{ template "webhooks/add_webhook.sql" }}
{{ template "webhooks/delete_webhook.sql" }}
{{ template "webhooks/get_webhook.sql" }}
{{ template "webhooks/get_org_webhooks.sql" }}
{{ template "webhooks/get_user_webhooks.sql" }}
{{ template "webhooks/get_webhooks_subscribed_to_package.sql" }}
{{ template "webhooks/update_webhook.sql" }}
{{ template "webhooks/user_has_access_to_webhook.sql" }}

---- create above / drop below ----

-- Nothing to do
