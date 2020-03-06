{{ template "functions/semver_gte.sql" }}
{{ template "functions/get_chart_repositories.sql" }}
{{ template "functions/get_chart_repository_by_name.sql" }}
{{ template "functions/get_chart_repository_packages_digest.sql" }}
{{ template "functions/register_package.sql" }}
{{ template "functions/get_stats.sql" }}
{{ template "functions/search_packages.sql" }}
{{ template "functions/get_package.sql" }}
{{ template "functions/get_packages_updates.sql" }}
{{ template "functions/register_image.sql" }}
{{ template "functions/get_image.sql" }}
{{ template "functions/register_user.sql" }}
{{ template "functions/verify_email.sql" }}
{{ template "functions/register_session.sql" }}

---- create above / drop below ----

-- Nothing to do
