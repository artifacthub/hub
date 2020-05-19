-- add_webhook adds the provided webhook to the database.
create or replace function add_webhook(
    p_user_id uuid,
    p_org_name text,
    p_webhook jsonb
) returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_id uuid;
    v_webhook_id uuid;
    v_event_kind integer;
    v_package jsonb;
begin
    if p_org_name <> '' then
        if not user_belongs_to_organization(p_user_id, p_org_name) then
            raise insufficient_privilege;
        end if;
        v_owner_organization_id = (select organization_id from organization where name = p_org_name);
    else
        v_owner_user_id = p_user_id;
    end if;

    -- Webhook
    insert into webhook (
        name,
        description,
        url,
        secret,
        content_type,
        template,
        active,
        user_id,
        organization_id
    ) values (
        p_webhook->>'name',
        nullif(p_webhook->>'description', ''),
        p_webhook->>'url',
        nullif(p_webhook->>'secret', ''),
        nullif(p_webhook->>'content_type', ''),
        nullif(p_webhook->>'template', ''),
        (p_webhook->>'active')::boolean,
        v_owner_user_id,
        v_owner_organization_id
    )
    returning webhook_id into v_webhook_id;

    -- Event kinds this webhook is interested in
    for v_event_kind in select * from jsonb_array_elements(nullif(p_webhook->'event_kinds', 'null'::jsonb))
    loop
        insert into webhook__event_kind (webhook_id, event_kind_id)
        values (v_webhook_id, v_event_kind);
    end loop;

    -- Packages this webhook is interested in
    for v_package in select * from jsonb_array_elements(nullif(p_webhook->'packages', 'null'::jsonb))
    loop
        insert into webhook__package (webhook_id, package_id)
        values (v_webhook_id, (v_package->>'package_id')::uuid);
    end loop;
end
$$ language plpgsql;
