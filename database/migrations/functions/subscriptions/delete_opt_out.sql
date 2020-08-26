-- delete_opt_out deletes the provided opt-out entry from the database.
create or replace function delete_opt_out(p_user_id uuid, p_opt_out_id uuid)
returns void as $$
    delete from opt_out where user_id = p_user_id and opt_out_id = p_opt_out_id;
$$ language sql;
