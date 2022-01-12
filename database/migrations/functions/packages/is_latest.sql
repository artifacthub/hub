-- is_latest checks if the package version we are trying to register is the
-- latest or not. For repositories of container image kind, we check the latest
-- version timestamp. For the other kinds, we check the latest version, which
-- must be a valid semver.
create or replace function is_latest(
    p_kind integer,
    p_version text,
    p_previous_latest_version text,
    p_ts timestamptz,
    p_previous_latest_version_ts timestamptz
)
returns boolean as $$
begin
    case p_kind
        when 12 then -- Container image
            return p_ts >= p_previous_latest_version_ts;
        else         -- Any other kind
            return semver_gte(p_version, p_previous_latest_version);
    end case;
end
$$ language plpgsql;
