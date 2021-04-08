alter table session alter column session_id drop default;

---- create above / drop below ----

alter table session alter column session_id set default gen_random_bytes(32);
