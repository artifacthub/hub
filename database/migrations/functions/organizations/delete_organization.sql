-- delete_organization deletes the provided organization from the database.
create or replace function delete_organization(p_requesting_user_id uuid, p_org_name text)
returns void as $$
begin
    if not user_belongs_to_organization(p_requesting_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    delete from organization where name = p_org_name;
end
$$ language plpgsql;
