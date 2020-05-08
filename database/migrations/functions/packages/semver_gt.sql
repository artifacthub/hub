-- semver_gt checks if the first semver provided is greater than the second one.
create or replace function semver_gt(p_v1 text, p_v2 text)
returns boolean as $$
declare
    semver_regexp text := '(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?';
    v1_parts text[] = regexp_match(p_v1, semver_regexp);
    v2_parts text[] = regexp_match(p_v2, semver_regexp);
    v1 int[] := v1_parts[1:3]::int[];
    v2 int[] := v2_parts[1:3]::int[];
    v1_prerelease text := v1_parts[4];
    v2_prerelease text := v2_parts[4];
begin
    if v1 > v2 then
        return true;
    elsif v1 = v2 then
        if v1_prerelease is null and v2_prerelease is null then
            return false;
        else
            if v1_prerelease is null then
                return true;
            elsif v2_prerelease is null then
                return false;
            else
                return v1_prerelease > v2_prerelease;
            end if;
        end if;
    else
        return false;
    end if;
end
$$ language plpgsql;
