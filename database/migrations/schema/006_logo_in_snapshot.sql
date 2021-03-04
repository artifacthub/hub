alter table snapshot add column logo_url text check (logo_url <> '');
alter table snapshot add column logo_image_id uuid;

update snapshot s set
    logo_url = p.logo_url,
    logo_image_id = p.logo_image_id
from package p
where s.package_id = p.package_id
and p.logo_image_id is not null;

alter table package drop column logo_url;
alter table package drop column logo_image_id;

---- create above / drop below ----

alter table package add column logo_url text check (logo_url <> '');
alter table package add column logo_image_id uuid;

update package p set
    logo_url = s.logo_url,
    logo_image_id =  s.logo_image_id
from snapshot s
where p.package_id = s.package_id
and p.latest_version = s.version
and s.logo_image_id is not null;

alter table snapshot drop column logo_url;
alter table snapshot drop column logo_image_id;
