create collation if not exists semver_prerelease (
  locale = 'en-US-u-kn-true',
  provider = 'icu'
);

---- create above / drop below ----

drop collation if exists semver_prerelease;
