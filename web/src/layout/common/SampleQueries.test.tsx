import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import SampleQueries from './SampleQueries';

jest.mock('../../utils/getSampleQueries', () => () => {
  return [
    {
      name: 'OLM operators for databases',
      queryString: 'kind=3&ts_query_web=database',
    },
    {
      name: 'Helm Charts provided by Bitnami',
      queryString: 'kind=0&org=bitnami',
    },
    {
      name: 'Packages of any kind related to etcd',
      queryString: 'ts_query_web=etcd',
    },
    {
      name: 'Falco rules for CVE',
      queryString: 'kind=1&ts_query_web=cve',
    },
    {
      name: 'OLM operators in the monitoring category',
      queryString: 'kind=3&ts_query=monitoring',
    },
    {
      name: 'Packages from verified publishers',
      queryString: 'verified_publisher=true',
    },
    {
      name: 'Official Prometheus packages',
      queryString: 'ts_query_web=prometheus&official=true',
    },
    {
      name: 'Operators with auto pilot capabilities',
      queryString: 'capabilities=auto+pilot',
    },
    {
      name: 'Helm Charts in the storage category',
      queryString: 'kind=0&ts_query=storage',
    },
    {
      name: 'Packages with Apache-2.0 license',
      queryString: 'license=Apache-2.0',
    },
    {
      name: 'OPA policies with MIT license',
      queryString: 'kind=2&license=MIT',
    },
    {
      name: 'Helm plugins',
      queryString: 'kind=6',
    },
    {
      name: 'Kubectl plugins',
      queryString: 'kind=5',
    },
    {
      name: 'Tekton tasks',
      queryString: 'kind=7',
    },
  ];
});

const mockQueries = [
  {
    name: 'OLM operators for databases',
    queryString: 'kind=3&ts_query_web=database',
  },
  {
    name: 'Helm Charts provided by Bitnami',
    queryString: 'kind=0&org=bitnami',
  },
  {
    name: 'Packages of any kind related to etcd',
    queryString: 'ts_query_web=etcd',
  },
  {
    name: 'Falco rules for CVE',
    queryString: 'kind=1&ts_query_web=cve',
  },
  {
    name: 'OLM operators in the monitoring category',
    queryString: 'kind=3&ts_query=monitoring',
  },
];

jest.mock('lodash', () => ({
  ...(jest.requireActual('lodash') as {}),
  sampleSize: () => {
    return mockQueries;
  },
}));

describe('SampleQueries', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SampleQueries />
      </Router>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <SampleQueries />
        </Router>
      );

      expect(screen.getAllByRole('link', { name: /Filter by/ })).toHaveLength(mockQueries.length);

      for (let i = 0; i < mockQueries.length; i++) {
        expect(screen.getByText(mockQueries[i].name)).toBeInTheDocument();
      }
    });

    it('renders proper classes', () => {
      render(
        <Router>
          <SampleQueries className="badge-light border-secondary text-secondary" />
        </Router>
      );

      const links = screen.getAllByRole('link', { name: /Filter by/ });
      expect(links[0]).toHaveClass('badge-light border-secondary text-secondary');
    });

    it('renders break line', () => {
      render(
        <Router>
          <SampleQueries lineBreakIn={2} />
        </Router>
      );

      expect(screen.getByTestId('sampleQueryBreakLine')).toBeInTheDocument();
    });

    it('opens first sample query', () => {
      render(
        <Router>
          <SampleQueries />
        </Router>
      );

      const links = screen.getAllByRole('link', { name: /Filter by/ });
      userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?kind=3&ts_query_web=database');
    });
  });
});
