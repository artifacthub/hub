-- get_packages_stars returns the number of stars of the given package as a
-- json object, including as well if the user doing the request starred the
-- package.
create or replace function get_package_stars(p_user_id uuid, p_package_id uuid)
returns setof json as $$
    select json_strip_nulls(json_build_object(
        'stars', (select stars from package where package_id = p_package_id),
        'starred_by_user', (
            case when p_user_id is not null then (
                select exists (
                    select * from user_starred_package
                    where package_id = p_package_id
                    and user_id = p_user_id
                )
            ) else null end
        )
    ));
$$ language sql;
