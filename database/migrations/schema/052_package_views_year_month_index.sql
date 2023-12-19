create index if not exists package_views_year_month_idx on package_views (date_trunc('year', day::timestamp), date_trunc('month', day::timestamp));

---- create above / drop below ----

drop index if exists package_views_year_month_idx;
