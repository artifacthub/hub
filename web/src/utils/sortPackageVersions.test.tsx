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
      { version: '0.10.0', createdAt: 1 },
      { version: '0.11.0', createdAt: 1 },
      { version: '0.12.0', createdAt: 1 },
      { version: '0.13.0', createdAt: 1 },
      { version: '0.14.0', createdAt: 1 },
    ],
    sortedVersions: [
      { version: '0.14.0', createdAt: 1 },
      { version: '0.13.0', createdAt: 1 },
      { version: '0.12.0', createdAt: 1 },
      { version: '0.11.0', createdAt: 1 },
      { version: '0.10.0', createdAt: 1 },
    ],
  },
  {
    versions: [
      { version: '1.3.1', createdAt: 1 },
      { version: '1.3.10', createdAt: 1 },
      { version: '1.3.3', createdAt: 1 },
      { version: '1.3.5', createdAt: 1 },
      { version: '1.3.6', createdAt: 1 },
    ],
    sortedVersions: [
      { version: '1.3.10', createdAt: 1 },
      { version: '1.3.6', createdAt: 1 },
      { version: '1.3.5', createdAt: 1 },
      { version: '1.3.3', createdAt: 1 },
      { version: '1.3.1', createdAt: 1 },
    ],
  },
  {
    versions: [
      { version: '1.8.2', createdAt: 1 },
      { version: '1.9.0', createdAt: 1 },
      { version: '1.9.1', createdAt: 1 },
      { version: '2.0.0-rc1', createdAt: 1 },
      { version: '2.0.0-rc2', createdAt: 1 },
    ],
    sortedVersions: [
      { version: '2.0.0-rc2', createdAt: 1 },
      { version: '2.0.0-rc1', createdAt: 1 },
      { version: '1.9.1', createdAt: 1 },
      { version: '1.9.0', createdAt: 1 },
      { version: '1.8.2', createdAt: 1 },
    ],
  },
  {
    versions: [
      { version: '0.4.0', createdAt: 1 },
      { version: '0.5', createdAt: 1 },
      { version: '0.5.1', createdAt: 1 },
      { version: '0.6', createdAt: 1 },
    ],
    sortedVersions: [
      { version: '0.5.1', createdAt: 1 },
      { version: '0.4.0', createdAt: 1 },
      { version: '0.5', createdAt: 1 },
      { version: '0.6', createdAt: 1 },
    ],
  },
  {
    versions: [
      { version: '0.1.0', createdAt: 1 },
      { version: '0.1.1', createdAt: 1 },
      { version: '0.1.2', createdAt: 1 },
      { version: '1.1.1', createdAt: 1 },
    ],
    sortedVersions: [
      { version: '1.1.1', createdAt: 1 },
      { version: '0.1.2', createdAt: 1 },
      { version: '0.1.1', createdAt: 1 },
      { version: '0.1.0', createdAt: 1 },
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
