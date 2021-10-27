-- delete_production_usage deletes the given organization from the list of
-- production users for the provided package.
create or replace function delete_production_usage(
    p_requesting_user_id uuid,
    p_repo_name text,
    p_pkg_name text,
    p_org_name text
) returns void as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    delete from production_usage
    where package_id = (
        select package_id
        from package p
        join repository r using (repository_id)
        where r.name = p_repo_name
        and p.name = p_pkg_name
    )
    and organization_id = (select organization_id from organization where name = p_org_name);
end
$$ language plpgsql;
