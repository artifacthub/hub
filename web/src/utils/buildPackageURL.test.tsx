import { Repository } from '../types';
import buildPackageURL from './buildPackageURL';

interface Props {
  normalizedName: string;
  repository: Repository;
  version: string;
}

const getmockProps = (fixtureId: string): Props => {
  return require(`./__fixtures__/buildPackageURL/${fixtureId}.json`) as Props;
};

describe('buildPackageURL', () => {
  describe('Helm kind', () => {
    it('renders URL without version', () => {
      const mockProps = getmockProps('2');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version)).toBe(
        `/packages/helm/${mockProps.repository.name}/${mockProps.normalizedName}`
      );
    });

    it('renders URL with version', () => {
      const mockProps = getmockProps('3');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/helm/${mockProps.repository.name}/${mockProps.normalizedName}/${mockProps.version}`
      );
    });
  });

  describe('Others kinds', () => {
    it('renders Falco rules', () => {
      const mockProps = getmockProps('4');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/falco/${mockProps.repository.name}/${mockProps.normalizedName}`
      );
    });

    it('renders Falco rules with version', () => {
      const mockProps = getmockProps('5');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/falco/${mockProps.repository.name}/${mockProps.normalizedName}/${mockProps.version}`
      );
    });

    it('renders OPA policies', () => {
      const mockProps = getmockProps('6');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/opa/${mockProps.repository.name}/${mockProps.normalizedName}`
      );
    });

    it('renders OPA policies with version', () => {
      const mockProps = getmockProps('7');
      expect(buildPackageURL(mockProps.normalizedName, mockProps.repository, mockProps.version, true)).toBe(
        `/packages/opa/${mockProps.repository.name}/${mockProps.normalizedName}/${mockProps.version}`
      );
    });
  });
});
