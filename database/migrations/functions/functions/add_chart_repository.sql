-- add_chart_repository adds the provided chart repository to the database.
create or replace function add_chart_repository(
    p_user_id uuid,
    p_org_name text,
    p_chart_repository jsonb
) returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_id uuid;
begin
    if p_org_name is not null and p_org_name <> '' then
        if not user_belongs_to_organization(p_user_id, p_org_name) then
            raise insufficient_privilege;
        end if;
        v_owner_organization_id = (select organization_id from organization where name = p_org_name);
    elsif p_user_id is not null then
        v_owner_user_id = p_user_id;
    else
        raise 'owner user or organization must be provided';
    end if;

    insert into chart_repository (
        name,
        display_name,
        url,
        user_id,
        organization_id
    ) values (
        p_chart_repository->>'name',
        nullif(p_chart_repository->>'display_name', ''),
        p_chart_repository->>'url',
        v_owner_user_id,
        v_owner_organization_id
    );
end
$$ language plpgsql;
