alter table snapshot add column security_report_alert_digest text;

---- create above / drop below ----

alter table snapshot drop column security_report_alert_digest;
