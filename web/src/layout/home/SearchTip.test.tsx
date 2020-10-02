import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { SEARH_TIPS } from '../../utils/data';
import SearchTip from './SearchTip';

const mockTip = SEARH_TIPS[0];

jest.mock('lodash', () => ({
  ...(jest.requireActual('lodash') as {}),
  sample: () => {
    return mockTip;
  },
}));

describe('SearchTip', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <SearchTip />
      </Router>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(
        <Router>
          <SearchTip />
        </Router>
      );

      expect(getByText(/to refine your search/i)).toBeInTheDocument();
    });
  });
});
