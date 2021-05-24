-- are_all_containers_images_whitelisted checks if all the containers images
-- provided have been whitelisted.
create or replace function are_all_containers_images_whitelisted(containers_images jsonb)
returns boolean as $$
    select (
        select array_agg(distinct(whitelisted)::boolean)
        from jsonb_path_query(containers_images, '$[*].whitelisted') as whitelisted
    ) = '{true}';
$$ language sql;
