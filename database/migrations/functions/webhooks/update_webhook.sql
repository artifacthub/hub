-- update_webhook updates the provided webhook in the database.
create or replace function update_webhook(p_user_id uuid, p_webhook jsonb)
returns void as $$
declare
    v_webhook_id uuid := (p_webhook->>'webhook_id')::uuid;
    v_owner_user_id uuid;
    v_owner_organization_name text;
    v_event_kind integer;
    v_package jsonb;
begin
    if not user_has_access_to_webhook(p_user_id, v_webhook_id) then
        raise insufficient_privilege;
    end if;

    -- Webhook
    update webhook set
        name = p_webhook->>'name',
        description = nullif(p_webhook->>'description', ''),
        url = p_webhook->>'url',
        secret = nullif(p_webhook->>'secret', ''),
        content_type = nullif(p_webhook->>'content_type', ''),
        template = nullif(p_webhook->>'template', ''),
        active = (p_webhook->>'active')::boolean
    where webhook_id = v_webhook_id;

    -- Bind webhook with event kinds if needed
    for v_event_kind in select * from jsonb_array_elements(nullif(p_webhook->'event_kinds', 'null'::jsonb))
    loop
        insert into webhook__event_kind (webhook_id, event_kind_id)
        values (v_webhook_id, v_event_kind)
        on conflict do nothing;
    end loop;

    -- Unbind deleted event kinds from webhook
    delete from webhook__event_kind
    where webhook_id = v_webhook_id
    and event_kind_id not in (
        select value::integer
        from jsonb_array_elements(nullif(p_webhook->'event_kinds', 'null'::jsonb))
    );

    -- Bind webhook with packages if needed
    for v_package in select * from jsonb_array_elements(nullif(p_webhook->'packages', 'null'::jsonb))
    loop
        insert into webhook__package (webhook_id, package_id)
        values (v_webhook_id, (v_package->>'package_id')::uuid)
        on conflict do nothing;
    end loop;

    -- Unbind deleted event kinds from webhook
    delete from webhook__package
    where webhook_id = v_webhook_id
    and package_id not in (
        select (value->>'package_id')::uuid
        from jsonb_array_elements(nullif(p_webhook->'packages', 'null'::jsonb))
    );
end
$$ language plpgsql;
