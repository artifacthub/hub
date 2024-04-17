import { Package } from '../types';
import isPackageOfficial from './isPackageOfficial';

interface Test {
  pkg?: Package | null;
  result: boolean;
}

const defaultPackage: Package = {
  packageId: 'dc5d4eda-8cee-4d19-a4c3-45aae7f6d894',
  name: 'artifact-hub',
  normalizedName: 'artifact-hub',
  logoImageId: 'f4d39ecd-b710-4b4e-a88f-234d94d73fce',
  stars: 0,
  description:
    'Artifact Hub is a web-based application that enables finding, installing, and publishing Cloud Native packages.',
  version: '0.15.0',
  appVersion: '0.15.0',
  license: 'Apache-2.0',
  deprecated: false,
  signed: false,
  ts: 1613115038,
  repository: {
    url: 'https://artifacthub.github.io/helm-charts',
    kind: 0,
    name: 'hub',
    official: false,
    userAlias: 'user1',
    repositoryId: '83b22476-75de-49c5-8209-abe10e8dcf0e',
    verifiedPublisher: false,
  },
};

const tests: Test[] = [
  {
    result: false,
  },
  {
    pkg: null,
    result: false,
  },
  {
    pkg: defaultPackage,
    result: false,
  },
  {
    pkg: { ...defaultPackage, repository: { ...defaultPackage.repository, official: true } },
    result: true,
  },
  {
    pkg: { ...defaultPackage, official: true },
    result: true,
  },
  {
    pkg: { ...defaultPackage, repository: { ...defaultPackage.repository, official: true }, official: false },
    result: true,
  },
];

describe('isPackageOfficial', () => {
  for (let i = 0; i < tests.length; i++) {
    it('check if pkg is official', () => {
      const actual = isPackageOfficial(tests[i].pkg);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
