import { render } from '@testing-library/react';
import React from 'react';

import ResourceLabel from './ResourceLabel';

describe('ResourceLabel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<ResourceLabel text="Scanner" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<ResourceLabel text="Scanner" />);

      expect(getByText('Scanner')).toBeInTheDocument();
      expect(getByText('Scanner')).toHaveClass('label');
    });
  });
});
