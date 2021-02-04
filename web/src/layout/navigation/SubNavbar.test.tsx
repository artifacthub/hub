import { render } from '@testing-library/react';
import React from 'react';

import SubNavbar from './SubNavbar';

const defaultProps = {
  children: <div data-testid="children">Test</div>,
};

describe('SubNavbar', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SubNavbar {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId, getByRole } = render(<SubNavbar {...defaultProps} />);

      expect(getByRole('navigation')).toBeInTheDocument();
      expect(getByTestId('children')).toBeInTheDocument();
      expect(getByText('Test')).toBeInTheDocument();
    });
  });
});
