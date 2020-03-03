-- register_image registers the provided image in the database.
create or replace function register_image(p_original_hash bytea, p_version text, p_data bytea)
returns setof uuid as $$
declare
    v_image_id uuid;
begin
    -- Get parent image id or register it if needed
    select image_id into v_image_id
    from image
    where original_hash = p_original_hash;
    if not found then
        insert into image (original_hash) values (p_original_hash)
        on conflict do nothing
        returning image_id into v_image_id;
        if not found then
            select image_id into v_image_id
            from image
            where original_hash = p_original_hash;
        end if;
    end if;

    -- Insert image version
    insert into image_version (image_id, version, data)
    select image_id, p_version, p_data from image where original_hash = p_original_hash
    on conflict do nothing
    returning image_id into v_image_id;
    if not found then
        select image_id into v_image_id
        from image i
        join image_version iv using (image_id)
        where i.original_hash = p_original_hash
        and iv.version = p_version;
    end if;

    return query select v_image_id;
end
$$ language plpgsql;
