import { render } from '@testing-library/react';
import React from 'react';

import SearchTip from './SearchTip';

describe('SearchTip', () => {
  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SearchTip />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<SearchTip />);

      expect(getByText(/to refine your search/i)).toBeInTheDocument();
    });
  });
});
