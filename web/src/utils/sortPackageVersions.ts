import semver from 'semver';

import { Version } from '../types';

const sortPackageVersions = (availableVersions: Version[]): Version[] => {
  if (availableVersions) {
    const validVersions: Version[] = availableVersions.filter((version: Version) => semver.valid(version.version));
    const invalidVersions: Version[] = availableVersions.filter((version: Version) => !semver.valid(version.version));
    try {
      const sortedValidVersions = validVersions.sort((a, b) => (semver.lt(a.version, b.version) ? 1 : -1));
      return [...sortedValidVersions, ...invalidVersions];
    } catch {
      return availableVersions;
    }
  }
  return [];
};

export default sortPackageVersions;
