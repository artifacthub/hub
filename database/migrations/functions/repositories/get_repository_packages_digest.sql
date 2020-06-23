-- get_repository_packages_digest returns the digest of all packages that
-- belong to the repository identified by the id provided.
create or replace function get_repository_packages_digest(p_repository_id uuid)
returns setof json as $$
    select coalesce(json_object_agg(format('%s@%s', p.name, s.version), s.digest), '{}')
    from package p
    join snapshot s using (package_id)
    where p.repository_id = p_repository_id;
$$ language sql;
