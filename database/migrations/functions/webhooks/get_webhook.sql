-- get_webhook returns the webhook identified by the id provided as a json
-- object.
create or replace function get_webhook(p_user_id uuid, p_webhook_id uuid)
returns setof json as $$
begin
    if p_user_id is not null and not user_has_access_to_webhook(p_user_id, p_webhook_id) then
        raise insufficient_privilege;
    end if;

    return query select json_build_object(
        'webhook_id', wh.webhook_id,
        'name', wh.name,
        'description', wh.description,
        'url', wh.url,
        'secret', wh.secret,
        'content_type', wh.content_type,
        'template', wh.template,
        'active', wh.active,
        'event_kinds', (
            select json_agg(event_kind_id)
            from webhook__event_kind wek
            where wek.webhook_id = wh.webhook_id
        ),
        'packages', (
            select json_agg(json_build_object(
                'package_id', p.package_id,
                'name', p.name,
                'logo_image_id', p.logo_image_id,
                'kind', p.package_kind_id,
                'user_alias', u.alias,
                'organization_name', o.name,
                'organization_display_name', o.display_name,
                'chart_repository', (select nullif(
                    jsonb_build_object(
                        'name', r.name,
                        'display_name', r.display_name
                    ),
                    '{"name": null, "display_name": null}'::jsonb
                ))
            ))
            from package p
            join webhook__package wp using (package_id)
            left join chart_repository r using (chart_repository_id)
            left join "user" u on p.user_id = u.user_id or r.user_id = u.user_id
            left join organization o
                on p.organization_id = o.organization_id or r.organization_id = o.organization_id
            where wp.webhook_id = wh.webhook_id
        )
    )
    from webhook wh
    where wh.webhook_id = p_webhook_id;
end
$$ language plpgsql;
