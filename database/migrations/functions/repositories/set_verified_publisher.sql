-- set_verified_publisher updates the verified publisher flag of the provided
-- repository.
create or replace function set_verified_publisher(p_repository_id uuid, p_verified boolean)
returns void as $$
    update repository set
        verified_publisher = p_verified
    where repository_id = p_repository_id;
$$ language sql;
