-- updates_chart_repository updates the provided chart repository in the
-- database.
create or replace function update_chart_repository(p_user_id uuid, p_chart_repository jsonb)
returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_name text;
begin
    -- Get user or organization owning the chart repository
    select cr.user_id, o.name into v_owner_user_id, v_owner_organization_name
    from chart_repository cr
    left join organization o using (organization_id)
    where cr.name = p_chart_repository->>'name';

    -- Check if the user doing the request is the owner or belongs to the
    -- organization which owns it
    if v_owner_organization_name is not null then
        if not user_belongs_to_organization(p_user_id, v_owner_organization_name) then
            raise insufficient_privilege;
        end if;
    elsif v_owner_user_id <> p_user_id then
        raise insufficient_privilege;
    end if;

    update chart_repository set
        display_name = nullif(p_chart_repository->>'display_name', ''),
        url = p_chart_repository->>'url'
    where name = p_chart_repository->>'name';
end
$$ language plpgsql;
