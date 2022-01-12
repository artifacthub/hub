import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import PackageViewsStats from './PackageViewsStats';
jest.mock('react-apexcharts', () => () => <div>Chart</div>);

const defaultProps = {
  title: <span>Views over the last 30 days</span>,
  repoKind: RepositoryKind.Helm,
};
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

describe('PackageViewsStats', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<PackageViewsStats {...defaultProps} stats={stats} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<PackageViewsStats {...defaultProps} stats={stats} />);

      expect(screen.getByText('Views over the last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
    });

    it('when stats are undefined', () => {
      const { rerender } = render(<PackageViewsStats {...defaultProps} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      rerender(<PackageViewsStats {...defaultProps} stats={stats} />);
      expect(screen.getByText('Views over the last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
    });
  });

  describe('Does not render', () => {
    it('when stats are empty', async () => {
      const { container } = render(<PackageViewsStats {...defaultProps} stats={{}} />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
