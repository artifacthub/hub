-- transfer_repository transfers the ownership of the provided repository to
-- to the requesting user or an organization he belongs to. The user must own
-- the repository transferred or belong to the organization which owns it,
-- unless this transfer is part of an ownership claim request that has been
-- previously authorized.
create or replace function transfer_repository(
    p_repository_name text,
    p_user_id uuid,
    p_org_name text,
    p_ownership_claim boolean
) returns void as $$
declare
    v_owner_user_id uuid;
    v_owner_organization_name text;
begin
    -- Validate repository ownership unless this transfer is part of an
    -- ownership claim request
    if not p_ownership_claim then
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
    end if;

    -- When transferring a repository to an organization, check the requesting
    -- user belongs to it
    if p_org_name is not null and not user_belongs_to_organization(p_user_id, p_org_name) then
        raise insufficient_privilege;
    end if;

    -- Register repository ownership claim event if needed
    -- We need to store the repository subscriptors before the transfer so that
    -- we can notify them afterwards.
    if p_ownership_claim then
        insert into event (repository_id, event_kind_id, data)
        select repository_id, 3, json_build_object(
            'subscriptors', get_repository_subscriptors(repository_id, 3)
        )
        from repository where name = p_repository_name;
    end if;

    -- Transfer repository ownership
    if p_org_name is null then
        update repository set
            user_id = p_user_id,
            organization_id = null
        where name = p_repository_name;
    else
        update repository set
            organization_id = (
                select organization_id from organization where name = p_org_name
            ),
            user_id = null
        where name = p_repository_name;
    end if;

    -- Regenerate repository's packages text search document using new
    -- publisher information
    with new_tsdoc as (
        select
            p.package_id,
            generate_package_tsdoc(
                p.name,
                p.alternative_name,
                s.display_name,
                s.description,
                s.keywords,
                array[r.name, r.display_name],
                array[u.alias, o.name, o.display_name, s.provider]
            ) as tsdoc
        from package p
        join snapshot s using (package_id)
        join repository r using (repository_id)
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where s.version = p.latest_version
        and r.name = p_repository_name
    )
    update package
    set tsdoc = new_tsdoc.tsdoc
    from new_tsdoc
    where package.package_id = new_tsdoc.package_id;

end
$$ language plpgsql;
