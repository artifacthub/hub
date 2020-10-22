-- get_reference_doc returns the reference documentation of the provided
-- snapshot as a json object.
create or replace function get_reference_doc(p_package_id uuid, p_version text)
returns setof json as $$
    select json_build_object(
        'values', s.values,
        'schema', s.schema
    )
    from snapshot s
    where package_id = p_package_id
    and version = p_version
$$ language sql;
