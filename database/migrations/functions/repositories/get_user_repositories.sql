-- get_repositories returns all available repositories that belong to the
-- provided user as a json array.
create or replace function get_user_repositories(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', repository_id,
        'name', name,
        'display_name', display_name,
        'url', url,
        'kind', repository_kind_id,
        'verified_publisher', verified_publisher,
        'official', official,
        'last_tracking_ts', floor(extract(epoch from last_tracking_ts)),
        'last_tracking_errors', last_tracking_errors
    )), '[]')
    from repository
    where user_id is not null
    and user_id = p_user_id;
$$ language sql;
