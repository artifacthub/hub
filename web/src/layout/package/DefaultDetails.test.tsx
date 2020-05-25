import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import DefaultDetails from './DefaultDetails';

const packageItem: Package = {
  packageId: 'id',
  kind: 1,
  name: 'test',
  displayName: 'Pretty name',
  description: 'desc',
  logoImageId: 'imageId',
  appVersion: '1.0.0',
  userAlias: null,
  normalizedName: 'pr',
  deprecated: false,
  keywords: ['key1', 'key2'],
  chartRepository: null,
  license: 'MIT',
};
const defaultProps = {
  package: packageItem,
  allVersions: [],
};

describe('DefaultDetails', () => {
  it('creates snapshot', () => {
    const result = render(
      <Router>
        <DefaultDetails {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByText } = render(
        <Router>
          <DefaultDetails {...defaultProps} />
        </Router>
      );

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('License')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      expect(getByText('key1')).toBeInTheDocument();
      expect(getByText('key2')).toBeInTheDocument();
      expect(getByText('MIT')).toBeInTheDocument();
      expect(getAllByText('-')).toHaveLength(1);
    });
  });
});
