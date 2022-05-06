import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Search tip', () => {
    it('renders properly modal', () => {
      render(
        <Router>
          <SearchTipsModal {...defaultProps} />
        </Router>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('d-block');
      expect(screen.getByText(/Search tips/)).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(SEARH_TIPS.length);
    });

    it('closes modal', async () => {
      render(
        <Router>
          <SearchTipsModal {...defaultProps} />
        </Router>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('d-block');

      const closeBtn = screen.getByRole('button', { name: 'Close' });
      await userEvent.click(closeBtn);

      expect(openTipsMock).toHaveBeenCalledTimes(1);
      expect(openTipsMock).toHaveBeenCalledWith(false);
    });

    for (let i = 0; i < SEARH_TIPS.length; i++) {
      it(`renders tip ${i + 1}`, () => {
        render(
          <Router>
            <SearchTipsModal {...defaultProps} />
          </Router>
        );

        expect(screen.getByRole('dialog')).toHaveClass('d-block');
        expect(screen.getByText(SEARH_TIPS[i].example)).toBeInTheDocument();
      });
    }

    it('clicks first search tip', async () => {
      render(
        <Router>
          <SearchTipsModal {...defaultProps} />
        </Router>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('d-block');

      const tips = screen.getAllByRole('link', { name: /Filter by/ });
      await userEvent.click(tips[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?ts_query_web=kafka+operator&sort=relevance&page=1');
    });
  });
});
