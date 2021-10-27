-- add_production_usage  adds the given organization to the list of production
-- users for the provided package.
create or replace function add_production_usage(
    p_requesting_user_id uuid,
    p_repo_name text,
    p_pkg_name text,
    p_org_name text
) returns void as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    insert into production_usage (
        package_id,
        organization_id
    ) values (
        (
            select package_id
            from package p
            join repository r using (repository_id)
            where r.name = p_repo_name
            and p.name = p_pkg_name
        ),
        (select organization_id from organization where name = p_org_name)
    );
end
$$ language plpgsql;
