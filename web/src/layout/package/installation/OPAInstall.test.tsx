import { render } from '@testing-library/react';
import React from 'react';

import OPAInstall from './OPAInstall';

const defaultProps = {
  install: 'Instructions',
};

describe('OPAInstall', () => {
  it('creates snapshot', () => {
    const result = render(<OPAInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<OPAInstall {...defaultProps} />);

      expect(getByText('Install repository')).toBeInTheDocument();
      expect(getByText(defaultProps.install)).toBeInTheDocument();
    });
  });
});
