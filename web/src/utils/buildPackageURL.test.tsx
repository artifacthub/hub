import { Package } from '../types';
import buildPackageURL from './buildPackageURL';

const getMockProps = (fixtureId: string): Package => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/buildPackageURL/${fixtureId}.json`) as Package;
};

describe('buildPackageURL', () => {
  describe('Helm kind', () => {
    it('renders URL without version', () => {
      const mockProps = getMockProps('2');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version)).toBe(
        `/packages/helm/${mockProps.repository.name}/${mockProps.name}`
      );
    });

    it('renders URL with version', () => {
      const mockProps = getMockProps('3');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/helm/${mockProps.repository.name}/${mockProps.name}/${mockProps.version}`
      );
    });
  });

  describe('Others kinds', () => {
    it('renders Falco rules', () => {
      const mockProps = getMockProps('4');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/falco/${mockProps.repository.name}/${mockProps.normalizedName}`
      );
    });

    it('renders Falco rules with version', () => {
      const mockProps = getMockProps('5');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/falco/${mockProps.repository.name}/${mockProps.normalizedName}/${mockProps.version}`
      );
    });

    it('renders OPA policies', () => {
      const mockProps = getMockProps('6');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/opa/${mockProps.repository.name}/${mockProps.normalizedName}`
      );
    });

    it('renders OPA policies with version', () => {
      const mockProps = getMockProps('7');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/opa/${mockProps.repository.name}/${mockProps.normalizedName}/${mockProps.version}`
      );
    });
  });
});
