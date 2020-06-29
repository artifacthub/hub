import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import SearchTip from './SearchTip';

describe('SearchTip', () => {
  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0);
  });

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
