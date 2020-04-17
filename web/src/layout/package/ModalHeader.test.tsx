import { render } from '@testing-library/react';
import React from 'react';

import { Package } from '../../types';
import ModalHeader from './ModalHeader';

const packageItem: Package = {
  packageId: 'id',
  kind: 0,
  name: 'test',
  displayName: 'Pretty name',
  description: 'desc',
  logoImageId: 'imageId',
  appVersion: '1.0.0',
  userAlias: null,
  normalizedName: 'pr',
  maintainers: [{ email: 'main@tainer.com', name: 'maintainerName' }],
  deprecated: false,
  chartRepository: {
    name: 'stable',
    displayName: null,
    url: 'repoUrl',
  },
};

describe('Links', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<ModalHeader package={packageItem} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByAltText } = render(<ModalHeader package={packageItem} />);

      expect(getByText(packageItem.displayName!)).toBeInTheDocument();
      expect(getByAltText(packageItem.displayName!)).toBeInTheDocument();
    });

    it('renders component without displayName', () => {
      const { getByText, getByAltText } = render(<ModalHeader package={{ ...packageItem, displayName: null }} />);

      expect(getByText(packageItem.name)).toBeInTheDocument();
      expect(getByAltText(packageItem.name)).toBeInTheDocument();
    });
  });
});
