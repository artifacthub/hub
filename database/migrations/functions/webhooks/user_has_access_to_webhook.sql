-- user_has_access_to_webhook checks if a user is the owner of the given webhook
-- or belongs to the organization who owns it.
create or replace function user_has_access_to_webhook(p_user_id uuid, p_webhook_id uuid)
returns boolean as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_name text;
begin
    -- Get user or organization owning the webhook
    select wh.user_id, o.name into v_owner_user_id, v_owner_organization_name
    from webhook wh
    left join organization o using (organization_id)
    where wh.webhook_id = p_webhook_id;

    -- Check if the user doing the request is the owner or belongs to the
    -- organization which owns it
    if v_owner_organization_name is not null then
        if not user_belongs_to_organization(p_user_id, v_owner_organization_name) then
            return false;
        end if;
    elsif v_owner_user_id <> p_user_id then
        return false;
    end if;

    return true;
end
$$ language plpgsql;
