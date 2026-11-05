alter table snapshot add column security_scan_attempted_at timestamptz;

---- create above / drop below ----

alter table snapshot drop column security_scan_attempted_at;
