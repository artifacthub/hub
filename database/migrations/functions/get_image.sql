-- get_image returns the image identified by the id and version provided.
create or replace function get_image(p_image_id uuid, p_version text)
returns setof bytea as $$
    select data
    from image_version
    where image_id = p_image_id
    and
        case when p_version <> '' and exists (
            select data from image_version
            where image_id = p_image_id
            and version = p_version
        ) then
            version = p_version
        else
            version = (
                select version from image_version
                where image_id = p_image_id
                order by version asc limit 1
            )
        end;
$$ language sql;
