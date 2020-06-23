import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import ChartDetails from './ChartDetails';

const packageItem: Package = {
  packageId: 'id',
  name: 'test',
  displayName: 'Pretty name',
  description: 'desc',
  logoImageId: 'imageId',
  appVersion: '1.0.0',
  normalizedName: 'pr',
  maintainers: [{ email: 'main@tainer.com', name: 'maintainerName' }],
  deprecated: false,
  repository: {
    kind: 0,
    name: 'stable',
    displayName: null,
    url: 'repoUrl',
    userAlias: 'user',
  },
  license: 'MIT',
  createdAt: 1,
  signed: false,
};
const defaultProps = {
  package: packageItem,
  allVersions: [],
};

describe('ChartDetails', () => {
  it('creates snapshot', () => {
    const result = render(
      <Router>
        <ChartDetails {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, queryByText, getAllByText } = render(
        <Router>
          <ChartDetails {...defaultProps} />
        </Router>
      );

      expect(getByText('Application version')).toBeInTheDocument();
      expect(getByText('Chart Versions')).toBeInTheDocument();
      expect(queryByText('Links')).toBeNull();
      expect(getByText('License')).toBeInTheDocument();
      expect(getByText('Maintainers')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      const maintainer = queryByText('maintainerName');
      expect(maintainer).toBeInTheDocument();
      expect(maintainer!.parentElement).toHaveProperty('href', 'mailto:main@tainer.com');

      expect(getByText('1.0.0')).toBeInTheDocument();
      expect(getAllByText('-')).toHaveLength(2);
      expect(getByText('MIT')).toBeInTheDocument();
    });
  });
});
