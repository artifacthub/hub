import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { SEARH_TIPS } from '../../utils/data';
import SearchTipsModal from './SearchTipsModal';

const openTipsMock = jest.fn();

const defaultProps = {
  size: 'big' as 'big' | 'normal',
  openTips: true,
  setOpenTips: openTipsMock,
};

describe('SearchTipsModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SearchTipsModal {...defaultProps} />
      </Router>
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Search tip', () => {
    it('renders properly modal', () => {
      const { getByRole, getByText, getAllByTestId } = render(
        <Router>
          <SearchTipsModal {...defaultProps} />
        </Router>
      );

      const modal = getByRole('dialog');
      expect(modal).toHaveClass('d-block');
      expect(getByText(/Search tips/g)).toBeInTheDocument();
      expect(getAllByTestId('searchTip')).toHaveLength(SEARH_TIPS.length);
    });

    it('closes modal', () => {
      const { getByRole, getByTestId } = render(
        <Router>
          <SearchTipsModal {...defaultProps} />
        </Router>
      );

      const modal = getByRole('dialog');
      expect(modal).toHaveClass('d-block');

      const closeBtn = getByTestId('closeModalBtn');
      fireEvent.click(closeBtn);

      expect(openTipsMock).toHaveBeenCalledTimes(1);
      expect(openTipsMock).toHaveBeenCalledWith(false);
    });

    for (let i = 0; i < SEARH_TIPS.length; i++) {
      it(`renders tip ${i + 1}`, () => {
        const { getByText, getByRole } = render(
          <Router>
            <SearchTipsModal {...defaultProps} />
          </Router>
        );

        expect(getByRole('dialog')).toHaveClass('d-block');
        expect(getByText(SEARH_TIPS[i].example)).toBeInTheDocument();
      });
    }

    it('clicks first search tip', () => {
      const { getByRole, getAllByTestId } = render(
        <Router>
          <SearchTipsModal {...defaultProps} />
        </Router>
      );

      const modal = getByRole('dialog');
      expect(modal).toHaveClass('d-block');

      const tips = getAllByTestId('searchTipLink');
      fireEvent.click(tips[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?ts_query_web=kafka+operator&page=1');
    });
  });
});
