{{ template "organizations/add_organization_member.sql" }}
{{ template "organizations/add_organization.sql" }}
{{ template "organizations/confirm_organization_membership.sql" }}
{{ template "organizations/delete_organization_member.sql" }}
{{ template "organizations/get_organization.sql" }}
{{ template "organizations/get_organization_members.sql" }}
{{ template "organizations/get_user_organizations.sql" }}
{{ template "organizations/update_organization.sql" }}
{{ template "organizations/user_belongs_to_organization.sql" }}

{{ template "users/get_user_profile.sql" }}
{{ template "users/register_session.sql" }}
{{ template "users/register_user.sql" }}
{{ template "users/update_user_password.sql" }}
{{ template "users/update_user_profile.sql" }}
{{ template "users/verify_email.sql" }}

{{ template "packages/generate_package_tsdoc.sql" }}
{{ template "packages/get_package.sql" }}
{{ template "packages/get_packages_starred_by_user.sql" }}
{{ template "packages/get_package_stars.sql" }}
{{ template "packages/get_packages_stats.sql" }}
{{ template "packages/get_packages_updates.sql" }}
{{ template "packages/register_package.sql" }}
{{ template "packages/search_packages.sql" }}
{{ template "packages/semver_gte.sql" }}
{{ template "packages/toggle_star.sql" }}
{{ template "packages/unregister_package.sql" }}

{{ template "chart_repositories/add_chart_repository.sql" }}
{{ template "chart_repositories/delete_chart_repository.sql" }}
{{ template "chart_repositories/get_chart_repositories.sql" }}
{{ template "chart_repositories/get_chart_repository_by_name.sql" }}
{{ template "chart_repositories/get_chart_repository_packages_digest.sql" }}
{{ template "chart_repositories/get_org_chart_repositories.sql" }}
{{ template "chart_repositories/get_user_chart_repositories.sql" }}
{{ template "chart_repositories/update_chart_repository.sql" }}

{{ template "images/get_image.sql" }}
{{ template "images/register_image.sql" }}

---- create above / drop below ----

-- Nothing to do
