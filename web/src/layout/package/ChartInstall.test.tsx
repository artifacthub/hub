import { render } from '@testing-library/react';
import React from 'react';

import { ChartRepository } from '../../types';
import ChartInstall from './ChartInstall';

const chartRepo: ChartRepository = {
  name: 'chartRepo',
  displayName: 'Chart Repo',
  url: 'http://chartRepo.test',
};
const defaultProps = {
  name: 'packageName',
  version: '1.0.0',
  repository: chartRepo,
};

describe('ChartInstall', () => {
  it('creates snapshot', () => {
    const result = render(<ChartInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<ChartInstall {...defaultProps} />);

      expect(getByText(`helm repo add ${chartRepo.name} ${chartRepo.url}`));
      expect(getByText(`helm install ${chartRepo.name}/${defaultProps.name} --version ${defaultProps.version}`));

      const helmLink = getByText('Need Helm?');
      expect(helmLink).toBeInTheDocument();
      expect(helmLink).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('does not render content when version is undefined', () => {
      const { container } = render(<ChartInstall {...defaultProps} version={undefined} />);
      expect(container).toBeEmpty();
    });
  });
});
