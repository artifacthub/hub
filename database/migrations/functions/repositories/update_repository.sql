-- updates_repository updates the provided repository in the database.
create or replace function update_repository(p_user_id uuid, p_repository jsonb)
returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_name text;
begin
    -- Get user or organization owning the repository
    select r.user_id, o.name into v_owner_user_id, v_owner_organization_name
    from repository r
    left join organization o using (organization_id)
    where r.name = p_repository->>'name';

    -- Check if the user doing the request is the owner or belongs to the
    -- organization which owns it
    if v_owner_organization_name is not null then
        if not user_belongs_to_organization(p_user_id, v_owner_organization_name) then
            raise insufficient_privilege;
        end if;
    elsif v_owner_user_id <> p_user_id then
        raise insufficient_privilege;
    end if;

    update repository set
        display_name = nullif(p_repository->>'display_name', ''),
        url = p_repository->>'url',
        auth_user = nullif(p_repository->>'auth_user', ''),
        auth_pass = nullif(p_repository->>'auth_pass', '')
    where name = p_repository->>'name';
end
$$ language plpgsql;
