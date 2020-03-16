import buildPackageURL from './buildPackageURL';
import { Package } from '../types';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/buildPackageURL/${fixtureId}.json`) as Package;
};

describe('buildPackageURL', () => {
  it('renders empty string by default', () => {
    const mockPackage = getMockPackage('1');
    expect(buildPackageURL(mockPackage)).toBe('');
  });

  describe('Chart kind', () => {
    it('renders URL without version', () => {
      const mockPackage = getMockPackage('2');
      expect(buildPackageURL(mockPackage)).toBe(`/package/chart/${mockPackage.chartRepository?.name}/${mockPackage.name}`);
    });

    it('renders URL with version', () => {
      const mockPackage = getMockPackage('3');
      expect(buildPackageURL(mockPackage, true)).toBe(`/package/chart/${mockPackage.chartRepository?.name}/${mockPackage.name}/${mockPackage.version}`);
    });
  });
});
