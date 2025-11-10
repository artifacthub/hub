import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import { RepositoryKind } from '../../types';
import Last30DaysViews from './Last30DaysViews';
vi.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div>Chart</div>,
}));

const fixedDate = new Date('2021-10-06T00:00:00Z');

const mockUseNavigate = jest.fn();

vi.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    __esModule: true,
    ...actual,
    default: actual,
    useNavigate: () => mockUseNavigate,
    useLocation: () => ({
      pathname: 'test',
      state: null,
    }),
  };
});

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

const defaultProps = {
  repoKind: RepositoryKind.Helm,
  stats: stats,
};

describe('Last30DaysViews', () => {
  beforeAll(() => {
    vi.useFakeTimers({
      now: fixedDate,
      toFake: ['Date'],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <Last30DaysViews {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <Last30DaysViews {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Last 30 days views')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('See details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'See views chart' })).toBeInTheDocument();
      expect(screen.getByText('(all versions)')).toBeInTheDocument();
    });

    it('displays correct legend', () => {
      render(
        <Router>
          <Last30DaysViews {...defaultProps} repoKind={RepositoryKind.Container} />
        </Router>
      );

      expect(screen.getByText('(all tags)')).toBeInTheDocument();
      expect(screen.queryByText('(all versions)')).toBeNull();
    });

    it('renders component when version is defined', () => {
      render(
        <Router>
          <Last30DaysViews {...defaultProps} version="21.0.4" />
        </Router>
      );

      expect(screen.getByText('Last 30 days views')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('See details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'See views chart' })).toBeInTheDocument();
      expect(screen.getByText('(21.0.4)')).toBeInTheDocument();
    });

    it('goes to Views chart section', async () => {
      render(
        <Router>
          <Last30DaysViews {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'See views chart' });
      await userEvent.click(btn);

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith(
        {
          hash: 'views',
          pathname: 'test',
        },
        {
          state: null,
        }
      );
    });

    it('when stats are empty', () => {
      const { rerender } = render(
        <Router>
          <Last30DaysViews repoKind={RepositoryKind.Helm} />
        </Router>
      );
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      rerender(
        <Router>
          <Last30DaysViews repoKind={RepositoryKind.Helm} stats={{}} />
        </Router>
      );
      expect(screen.getByText('Last 30 days views')).toBeInTheDocument();
      expect(screen.getByText('No views yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'See views chart' })).toBeDisabled();
    });
  });
});
