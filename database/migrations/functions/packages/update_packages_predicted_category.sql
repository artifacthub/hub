-- update_packages_predicted_category updates the category of the packages
-- provided when it has changed. The category source and the latest version
-- are checked so that a package whose category has been provided by the
-- publisher, or predicted for a new version, in the meantime is never
-- overwritten.
create or replace function update_packages_predicted_category(p_predictions jsonb)
returns void as $$
    update package p
    set package_category_id = nullif(x.category, 0)
    from jsonb_to_recordset(p_predictions) as x(package_id uuid, latest_version text, category integer)
    where p.package_id = x.package_id
    and p.package_category_source = 'predicted'
    and p.latest_version = x.latest_version
    and p.package_category_id is distinct from nullif(x.category, 0);
$$ language sql;
