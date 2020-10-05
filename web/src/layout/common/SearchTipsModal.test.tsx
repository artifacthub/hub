import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { SEARH_TIPS } from '../../utils/data';
import SearchTipsModal from './SearchTipsModal';

describe('SearchTipsModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SearchTipsModal size="big" />
      </Router>
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Search tip', () => {
    it('opens modal', () => {
      const { getByTestId, getByRole, getByText, getAllByTestId } = render(
        <Router>
          <SearchTipsModal size="big" />
        </Router>
      );

      const modal = getByRole('dialog');
      expect(modal).not.toHaveClass('d-block');

      const btn = getByTestId('openSearchTipsBtn');
      fireEvent.click(btn);

      expect(modal).toHaveClass('d-block');
      expect(getByText(/Search tips/g)).toBeInTheDocument();
      expect(getAllByTestId('searchTip')).toHaveLength(SEARH_TIPS.length);
    });

    for (let i = 0; i < SEARH_TIPS.length; i++) {
      it(`renders tip ${i + 1}`, () => {
        const { getByText, getByTestId, getByRole } = render(
          <Router>
            <SearchTipsModal size="big" />
          </Router>
        );

        const btn = getByTestId('openSearchTipsBtn');
        fireEvent.click(btn);

        expect(getByRole('dialog')).toHaveClass('d-block');

        expect(getByText(SEARH_TIPS[i].example)).toBeInTheDocument();
      });
    }

    it('clicks first search tip', () => {
      const { getByTestId, getByRole, getAllByTestId } = render(
        <Router>
          <SearchTipsModal size="big" />
        </Router>
      );

      const modal = getByRole('dialog');
      expect(modal).not.toHaveClass('d-block');

      const btn = getByTestId('openSearchTipsBtn');
      fireEvent.click(btn);

      expect(modal).toHaveClass('d-block');

      const tips = getAllByTestId('searchTipLink');
      fireEvent.click(tips[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&ts_query_web=kafka+operator');
    });
  });
});
