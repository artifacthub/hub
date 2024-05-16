import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import { SEARH_TIPS } from '../../utils/data';
import SearchTip from './SearchTip';

const mockTip = SEARH_TIPS[0];

jest.mock('lodash/sample', () => () => mockTip);

describe('SearchTip', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SearchTip />
      </Router>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <SearchTip />
        </Router>
      );

      expect(screen.getByText(/to refine your search/i)).toBeInTheDocument();
    });
  });
});
