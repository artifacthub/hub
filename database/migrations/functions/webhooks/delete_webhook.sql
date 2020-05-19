-- delete_webhook deletes the provided webhook from the database.
create or replace function delete_webhook(p_user_id uuid, p_webhook_id uuid)
returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_name text;
begin
    if not user_has_access_to_webhook(p_user_id, p_webhook_id) then
        raise insufficient_privilege;
    end if;

    delete from webhook where webhook_id = p_webhook_id;
end
$$ language plpgsql;
