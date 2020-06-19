-- delete_repository deletes the provided repository from the database.
create or replace function delete_repository(p_user_id uuid, p_repository_name text)
returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_name text;
begin
    -- Get user or organization owning the repository
    select r.user_id, o.name into v_owner_user_id, v_owner_organization_name
    from repository r
    left join organization o using (organization_id)
    where r.name = p_repository_name;

    -- Check if the user doing the request is the owner or belongs to the
    -- organization which owns it
    if v_owner_organization_name is not null then
        if not user_belongs_to_organization(p_user_id, v_owner_organization_name) then
            raise insufficient_privilege;
        end if;
    elsif v_owner_user_id <> p_user_id then
        raise insufficient_privilege;
    end if;

    delete from repository where name = p_repository_name;
end
$$ language plpgsql;
