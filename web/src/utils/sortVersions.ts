import semver from 'semver';

const sortVersions = (availableVersions: string[]): string[] => {
  if (availableVersions) {
     const validVersions: string[] = availableVersions.filter((version: string) => semver.valid(version));
    const invalidVersions: string[] = availableVersions.filter((version: string) => !semver.valid(version));
    try {
      const sortedValidVersions = validVersions.sort((a, b) => (semver.lt(a, b) ? 1 : -1));
      return [...sortedValidVersions, ...invalidVersions.sort().reverse()];
    } catch {
      return availableVersions;
    }
  } else {
    return [];
  }
};

export default sortVersions;
