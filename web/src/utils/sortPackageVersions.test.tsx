import { Version } from '../types';
import sortPackageVersions from './sortPackageVersions';

interface Test {
  versions: Version[];
  sortedVersions: Version[];
}

const testsOrder: Test[] = [
  { versions: [], sortedVersions: [] },
  {
    versions: [
      { version: '0.10.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.11.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.12.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.13.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.14.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
    sortedVersions: [
      { version: '0.14.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.13.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.12.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.11.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.10.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
  },
  {
    versions: [
      { version: '1.3.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.10', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.3', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.5', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.6', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
    sortedVersions: [
      { version: '1.3.10', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.6', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.5', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.3', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.3.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
  },
  {
    versions: [
      { version: '1.8.2', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.9.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.9.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '2.0.0-rc1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '2.0.0-rc2', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
    sortedVersions: [
      { version: '2.0.0-rc2', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '2.0.0-rc1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.9.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.9.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.8.2', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
  },
  {
    versions: [
      { version: '0.4.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.5', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.5.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.6', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
    sortedVersions: [
      { version: '0.5.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.4.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.5', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.6', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
  },
  {
    versions: [
      { version: '0.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.1.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.1.2', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '1.1.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
    sortedVersions: [
      { version: '1.1.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.1.2', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.1.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
      { version: '0.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    ],
  },
];

describe('sortPackageVersions', () => {
  for (let i = 0; i < testsOrder.length; i++) {
    it('renders proper order', () => {
      const actual = sortPackageVersions(testsOrder[i].versions);
      expect(actual).toStrictEqual(testsOrder[i].sortedVersions);
    });
  }
});
