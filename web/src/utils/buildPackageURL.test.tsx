import { Package } from '../types';
import buildPackageURL from './buildPackageURL';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/buildPackageURL/${fixtureId}.json`) as Package;
};

describe('buildPackageURL', () => {
  describe('Helm kind', () => {
    it('renders URL without version', () => {
      const mockPackage = getMockPackage('2');
      expect(buildPackageURL(mockPackage)).toBe(`/packages/helm/${mockPackage.repository.name}/${mockPackage.name}`);
    });

    it('renders URL with version', () => {
      const mockPackage = getMockPackage('3');
      expect(buildPackageURL(mockPackage, true)).toBe(
        `/packages/helm/${mockPackage.repository.name}/${mockPackage.name}/${mockPackage.version}`
      );
    });
  });

  describe('Others kinds', () => {
    it('renders Falco rules', () => {
      const mockPackage = getMockPackage('4');
      expect(buildPackageURL(mockPackage, true)).toBe(
        `/packages/falco/${mockPackage.repository.name}/${mockPackage.normalizedName}`
      );
    });

    it('renders Falco rules with version', () => {
      const mockPackage = getMockPackage('5');
      expect(buildPackageURL(mockPackage, true)).toBe(
        `/packages/falco/${mockPackage.repository.name}/${mockPackage.normalizedName}/${mockPackage.version}`
      );
    });

    it('renders OPA policies', () => {
      const mockPackage = getMockPackage('6');
      expect(buildPackageURL(mockPackage, true)).toBe(
        `/packages/opa/${mockPackage.repository.name}/${mockPackage.normalizedName}`
      );
    });

    it('renders OPA policies with version', () => {
      const mockPackage = getMockPackage('7');
      expect(buildPackageURL(mockPackage, true)).toBe(
        `/packages/opa/${mockPackage.repository.name}/${mockPackage.normalizedName}/${mockPackage.version}`
      );
    });
  });
});
