{{ template "functions/semver_gte.sql" }}
{{ template "functions/add_chart_repository.sql" }}
{{ template "functions/update_chart_repository.sql" }}
{{ template "functions/delete_chart_repository.sql" }}
{{ template "functions/get_chart_repositories.sql" }}
{{ template "functions/get_chart_repository_by_name.sql" }}
{{ template "functions/get_chart_repository_packages_digest.sql" }}
{{ template "functions/get_user_chart_repositories.sql" }}
{{ template "functions/get_org_chart_repositories.sql" }}
{{ template "functions/get_packages_stats.sql" }}
{{ template "functions/get_packages_updates.sql" }}
{{ template "functions/get_package.sql" }}
{{ template "functions/register_package.sql" }}
{{ template "functions/search_packages.sql" }}
{{ template "functions/get_image.sql" }}
{{ template "functions/register_image.sql" }}
{{ template "functions/register_user.sql" }}
{{ template "functions/verify_email.sql" }}
{{ template "functions/register_session.sql" }}
{{ template "functions/get_user_organizations.sql" }}
{{ template "functions/add_organization.sql" }}
{{ template "functions/update_organization.sql" }}
{{ template "functions/get_organization_members.sql" }}
{{ template "functions/add_organization_member.sql" }}
{{ template "functions/confirm_organization_membership.sql" }}
{{ template "functions/delete_organization_member.sql" }}
{{ template "functions/user_belongs_to_organization.sql" }}

---- create above / drop below ----

-- Nothing to do
