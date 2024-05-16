import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import SampleQueries from './SampleQueries';

jest.mock('../../utils/getSampleQueries', () => () => {
  return [
    {
      name: 'OLM operators for databases',
      querystring: 'kind=3&ts_query_web=database',
    },
    {
      name: 'Helm Charts provided by Bitnami',
      querystring: 'kind=0&org=bitnami',
    },
    {
      name: 'Packages of any kind related to etcd',
      querystring: 'ts_query_web=etcd',
    },
    {
      name: 'Falco rules for CVE',
      querystring: 'kind=1&ts_query_web=cve',
    },
    {
      name: 'Packages from verified publishers',
      querystring: 'verified_publisher=true',
    },
    {
      name: 'Official Prometheus packages',
      querystring: 'ts_query_web=prometheus&official=true',
    },
    {
      name: 'Operators with auto pilot capabilities',
      querystring: 'capabilities=auto+pilot',
    },
    {
      name: 'Packages with Apache-2.0 license',
      querystring: 'license=Apache-2.0',
    },
    {
      name: 'OPA policies with MIT license',
      querystring: 'kind=2&license=MIT',
    },
    {
      name: 'Helm plugins',
      querystring: 'kind=6',
    },
    {
      name: 'Kubectl plugins',
      querystring: 'kind=5',
    },
    {
      name: 'Tekton tasks',
      querystring: 'kind=7',
    },
    {
      name: 'Container images',
      querystring: 'kind=12',
    },
    {
      name: 'Kubewarden policies',
      querystring: 'kind=13',
    },
    {
      name: 'Gatekeeper policies',
      querystring: 'kind=14',
    },
    {
      name: 'Kyverno policies',
      querystring: 'kind=15',
    },
    {
      name: 'Knative client plugings',
      querystring: 'kind=16',
    },
  ];
});

const mockQueries = [
  {
    name: 'OLM operators for databases',
    querystring: 'kind=3&ts_query_web=database',
  },
  {
    name: 'Helm Charts provided by Bitnami',
    querystring: 'kind=0&org=bitnami',
  },
  {
    name: 'Packages of any kind related to etcd',
    querystring: 'ts_query_web=etcd',
  },
  {
    name: 'Falco rules for CVE',
    querystring: 'kind=1&ts_query_web=cve',
  },
];

jest.mock('lodash/sampleSize', () => () => mockQueries);

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

    it('opens first sample query', async () => {
      render(
        <Router>
          <SampleQueries />
        </Router>
      );

      const links = screen.getAllByRole('link', { name: /Filter by/ });
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?kind=3&ts_query_web=database');
    });
  });
});
