import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import Last30DaysViews from './Last30DaysViews';
jest.mock('react-apexcharts', () => () => <div>Chart</div>);

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
    location: {
      pathname: 'test',
    },
  }),
}));

const stats = {
  '19.0.1': {
    '2021-12-09': 2,
    '2021-12-10': 1,
    '2021-12-11': 1,
  },
  '9.3.4': {
    '2021-12-08': 1,
    '2021-12-09': 1,
  },
  '21.0.2': {
    '2021-12-08': 2,
    '2021-12-09': 1,
  },
  '23.1.6': {
    '2021-12-09': 39,
    '2021-12-10': 307,
  },
  '23.1.5': {
    '2021-12-09': 255,
    '2021-12-10': 15,
  },
  '14.6.0': {
    '2021-12-09': 1,
  },
  '17.0.0': {
    '2021-12-10': 1,
  },
  '16.12.1': {
    '2021-12-09': 2,
    '2021-12-10': 1,
  },
  '20.0.1': {
    '2021-12-08': 2,
    '2021-12-09': 7,
    '2021-12-10': 1,
  },
  '23.1.2': {
    '2021-12-08': 69,
    '2021-12-09': 7,
  },
  '15.4.6': {
    '2021-12-10': 2,
  },
  '23.2.0': {
    '2021-12-10': 46,
    '2021-12-11': 125,
    '2021-12-12': 24,
  },
  '19.3.0': {
    '2021-12-09': 2,
    '2021-12-10': 3,
  },
  '19.2.2': {
    '2021-12-09': 1,
    '2021-12-10': 7,
  },
  '21.0.1': {
    '2021-12-08': 2,
    '2021-12-10': 2,
  },
  '19.2.1': {
    '2021-12-10': 1,
  },
  '23.0.0': {
    '2021-12-08': 7,
    '2021-12-09': 1,
  },
  '21.0.4': {
    '2021-12-09': 1,
    '2021-12-10': 3,
    '2021-12-11': 1,
  },
};

describe('Last30DaysViews', () => {
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1639468828000);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Last30DaysViews stats={stats} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Last30DaysViews stats={stats} />);

      expect(screen.getByText('Last 30 days views')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('See details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'See views chart' })).toBeInTheDocument();
      expect(screen.getByText('(all versions)')).toBeInTheDocument();
    });

    it('renders component', () => {
      render(<Last30DaysViews stats={stats} version="21.0.4" />);

      expect(screen.getByText('Last 30 days views')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('See details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'See views chart' })).toBeInTheDocument();
      expect(screen.getByText('(21.0.4)')).toBeInTheDocument();
    });

    it('goes to Views chart section', () => {
      render(
        <Router>
          <Last30DaysViews stats={stats} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'See views chart' });
      fireEvent.click(btn);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        hash: 'views-over-the-last-30-days',
        pathname: 'test',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });
    });

    it('when stats are empty', () => {
      const { rerender } = render(<Last30DaysViews />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      rerender(<Last30DaysViews stats={{}} />);
      expect(screen.getByText('Last 30 days views')).toBeInTheDocument();
      expect(screen.getByText('No views yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'See views chart' })).toBeDisabled();
    });
  });
});
